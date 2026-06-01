"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { KeyRound, RotateCcw } from "lucide-react";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";
import { Button } from "@/components/ui/button";

const LOCAL_BACKEND_API_URL = "http://localhost:8000";
const SERVER_BACKEND_API_URL = "https://iplvr.it.ntnu.no/backend";
type BackendTarget = "local" | "server";

interface Role {
  name: string;
  description: string;
  document_access: string[];
}

interface ExternalAgentInfo {
  agent_id: string;
  name: string;
  roles: Role[];
}

interface ContextUsed {
  document_name: string;
  category: string;
  chunk_index: number;
  content: string;
}

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  contextUsed?: ContextUsed[];
}

interface APIError {
  title: string;
  message: string;
}

export default function ExternalChatPage() {
  const [accessKey, setAccessKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agentInfo, setAgentInfo] = useState<ExternalAgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [apiError, setApiError] = useState<APIError | null>(null);
  const [backendTarget, setBackendTarget] = useState<BackendTarget>("local");

  const normalizedRoleName = roleName.trim();
  const historyStorageKey = useMemo(() => {
    if (!agentInfo || !normalizedRoleName) return null;
    return `ragdoll_external_chat_${agentInfo.agent_id}_${normalizedRoleName}`;
  }, [agentInfo, normalizedRoleName]);
  const activeBackendUrl =
    backendTarget === "local" ? LOCAL_BACKEND_API_URL : SERVER_BACKEND_API_URL;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTarget = window.localStorage.getItem(
      "ragdoll_external_backend_target"
    );
    if (storedTarget === "local" || storedTarget === "server") {
      setBackendTarget(storedTarget);
      return;
    }

    setBackendTarget(
      window.location.hostname === "localhost" ? "local" : "server"
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ragdoll_external_backend_target", backendTarget);
  }, [backendTarget]);

  useEffect(() => {
    if (!historyStorageKey || typeof window === "undefined") return;

    try {
      const storedHistory = window.localStorage.getItem(historyStorageKey);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setMessages(parsed as ChatMessage[]);
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to parse stored external chat history", error);
    }

    setMessages([
      {
        role: "agent",
        content: `Hello! I'm ${normalizedRoleName}. How can I help you?`,
      },
    ]);
  }, [historyStorageKey, normalizedRoleName]);

  useEffect(() => {
    if (!historyStorageKey || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(messages));
    } catch (error) {
      console.warn("Failed to persist external chat history", error);
    }
  }, [historyStorageKey, messages]);

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyForRequest = accessKey.trim();
    const roleForRequest = roleName.trim();

    if (!keyForRequest || !roleForRequest) {
      setApiError({
        title: "Missing Details",
        message: "Enter both an access key and role.",
      });
      return;
    }

    setIsConnecting(true);
    setApiError(null);

    try {
      const response = await axios.get<ExternalAgentInfo>(
        `${activeBackendUrl}/agent-info-by-accesskey`,
        {
          headers: {
            "access-key": keyForRequest,
          },
        }
      );

      const resolvedAgent = response.data;
      const matchingRole = resolvedAgent.roles.find(
        (role) => role.name === roleForRequest
      );

      if (!matchingRole) {
        const availableRoles =
          resolvedAgent.roles.map((role) => role.name).join(", ") || "none";
        setApiError({
          title: "Role Not Found",
          message: `Role '${roleForRequest}' is not configured for this agent. Available roles: ${availableRoles}`,
        });
        setAgentInfo(null);
        return;
      }

      setAgentInfo(resolvedAgent);
    } catch (error) {
      setAgentInfo(null);
      setApiError({
        title: "Access Denied",
        message: `${
          axios.isAxiosError(error)
            ? error.response?.data?.detail ||
              error.response?.data?.message ||
              "The access key is invalid or expired."
            : "The access key is invalid or expired."
        } Backend: ${activeBackendUrl}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim() || !agentInfo || !normalizedRoleName) return;

    const userMessage: ChatMessage = { role: "user", content: prompt };
    const chatLogForRequest = [...messages, userMessage];
    setMessages(chatLogForRequest);
    setIsAwaitingResponse(true);

    axios
      .post(`${activeBackendUrl}/api/chat/ask`, {
        agent_id: agentInfo.agent_id,
        active_role_id: normalizedRoleName,
        access_key: accessKey.trim(),
        chat_log: chatLogForRequest,
      })
      .then((response) => {
        const agentResponse = response.data.response.response;
        const contextUsed = response.data.response.context_used;
        setMessages((previousMessages) => [
          ...previousMessages,
          {
            role: "agent",
            content: agentResponse,
            contextUsed: contextUsed || [],
          },
        ]);
      })
      .catch((error) => {
        setApiError({
          title: "Communication Error",
          message: axios.isAxiosError(error)
            ? error.response?.data?.message ||
              error.response?.data?.detail ||
              "Unable to communicate with the agent."
            : "Unable to communicate with the agent.",
        });
        setMessages((previousMessages) => [
          ...previousMessages,
          { role: "agent", content: "Error communicating with agent" },
        ]);
      })
      .finally(() => setIsAwaitingResponse(false));
  };

  const handleReset = () => {
    setAgentInfo(null);
    setMessages([]);
    setApiError(null);
  };

  const handleBackendTargetChange = (target: BackendTarget) => {
    setBackendTarget(target);
    setAgentInfo(null);
    setMessages([]);
    setApiError(null);
  };

  const handleClearHistory = () => {
    if (!normalizedRoleName) return;
    setMessages([
      {
        role: "agent",
        content: `Hello! I'm ${normalizedRoleName}. How can I help you?`,
      },
    ]);
  };

  if (!agentInfo) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
          <form
            onSubmit={handleConnect}
            className="w-full space-y-5 rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">External Agent Chat</h1>
              <p className="text-muted-foreground text-sm">
                Use an agent access key and role to start a session.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Backend</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={backendTarget === "local" ? "default" : "outline"}
                  onClick={() => handleBackendTargetChange("local")}
                >
                  Localhost
                </Button>
                <Button
                  type="button"
                  variant={backendTarget === "server" ? "default" : "outline"}
                  onClick={() => handleBackendTargetChange("server")}
                >
                  Server
                </Button>
              </div>
              <div className="text-muted-foreground break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs">
                {activeBackendUrl}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Access key</span>
              <input
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                className="border-input focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Role</span>
              <input
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                className="border-input focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            {apiError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="font-medium">{apiError.title}</div>
                <div>{apiError.message}</div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isConnecting || !accessKey.trim() || !roleName.trim()}
            >
              <KeyRound className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Start chat"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="absolute top-4 left-4 z-50">
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-medium">{agentInfo.name}</span>
          <span className="text-muted-foreground text-sm">
            Role: {normalizedRoleName}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearHistory}
            disabled={isAwaitingResponse}
          >
            Clear history
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isAwaitingResponse}
          >
            <RotateCcw className="h-4 w-4" />
            Change key
          </Button>
        </div>
      </div>
      <div className="flex h-screen w-full flex-col items-center pb-22">
        <MessagesView
          isLoading={isAwaitingResponse}
          messages={messages}
          agentName={agentInfo.name}
        />
        <ChatInput disabled={isAwaitingResponse} onSend={handleSendPrompt} />
      </div>

      {apiError && (
        <div className="fixed right-4 bottom-24 z-50 max-w-md rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="font-medium">{apiError.title}</div>
          <div>{apiError.message}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setApiError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </main>
  );
}
