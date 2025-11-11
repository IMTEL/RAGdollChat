"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";
import RoleSelector, { Role } from "@/components/ui/agent-selector";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

interface AgentInfo {
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

const AgentPage = () => {
  const params = useParams();
  const agent_id = params.agent_id as string;

  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [chatHistories, setChatHistories] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [apiError, setApiError] = useState<APIError | null>(null);

  const historyStorageKey = agent_id
    ? `ragdoll_chat_history_${agent_id}`
    : null;
  const roleStorageKey = agent_id ? `ragdoll_selected_role_${agent_id}` : null;

  // Initialize agent info and set initial greeting
  useEffect(() => {
    if (agent_id) {
      // Fetch agent information
      console.log("Fetching agent info for ID:", agent_id);
      axios
        .get(`${BACKEND_API_URL}/agent-info/?agent_id=${agent_id}`, {
          headers: {
            "access-key": key,
          },
        })
        .then((response) => {
          console.log(response.data);
          setAgentInfo(response.data);
        })
        .catch((error) => {
          console.error("Error fetching agent info:", error);
        });
    }
  }, [agent_id, key]);

  // Load chat history and selected role from localStorage once per agent
  useEffect(() => {
    if (!agent_id || typeof window === "undefined") {
      return;
    }

    setIsHistoryLoaded(false);
    setChatHistories({});
    setSelectedRole(null);

    try {
      const storedHistories = historyStorageKey
        ? window.localStorage.getItem(historyStorageKey)
        : null;
      if (storedHistories) {
        const parsed = JSON.parse(storedHistories);
        if (parsed && typeof parsed === "object") {
          setChatHistories(parsed as Record<string, ChatMessage[]>);
        }
      }
    } catch (error) {
      console.warn("Failed to parse stored chat history", error);
    }

    if (roleStorageKey) {
      const storedRole = window.localStorage.getItem(roleStorageKey);
      if (storedRole) {
        setSelectedRole(storedRole);
      }
    }

    setIsHistoryLoaded(true);
  }, [agent_id, historyStorageKey, roleStorageKey]);

  // Ensure a valid selected role once agent info is available
  useEffect(() => {
    if (!agentInfo || agentInfo.roles.length === 0) {
      return;
    }

    if (
      selectedRole &&
      agentInfo.roles.some((role) => role.name === selectedRole)
    ) {
      return;
    }

    const fallbackRole = agentInfo.roles[0]?.name ?? null;
    setSelectedRole(fallbackRole);
  }, [agentInfo, selectedRole]);

  // Seed a greeting message for roles without history
  useEffect(() => {
    if (!selectedRole || !agentInfo || !isHistoryLoaded) {
      return;
    }

    setChatHistories((prev) => {
      const existingHistory = prev[selectedRole];
      if (existingHistory && existingHistory.length > 0) {
        return prev;
      }

      const greeting = `Hello! I'm ${selectedRole}. How can I help you?`;
      const greetingMessage: ChatMessage = {
        role: "agent",
        content: greeting,
      };
      return {
        ...prev,
        [selectedRole]: [greetingMessage],
      };
    });
  }, [selectedRole, agentInfo, isHistoryLoaded]);

  // Persist chat histories to localStorage when they change
  useEffect(() => {
    if (
      !isHistoryLoaded ||
      !historyStorageKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        historyStorageKey,
        JSON.stringify(chatHistories)
      );
    } catch (error) {
      console.warn("Failed to persist chat history", error);
    }
  }, [chatHistories, historyStorageKey, isHistoryLoaded]);

  // Persist selected role to localStorage
  useEffect(() => {
    if (!isHistoryLoaded || !roleStorageKey || typeof window === "undefined") {
      return;
    }

    if (selectedRole) {
      window.localStorage.setItem(roleStorageKey, selectedRole);
    } else {
      window.localStorage.removeItem(roleStorageKey);
    }
  }, [selectedRole, roleStorageKey, isHistoryLoaded]);

  const currentChatLog = selectedRole
    ? (chatHistories[selectedRole] ?? [])
    : [];

  // Clear chat log and show new greeting when role changes
  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim() || !selectedRole) return;

    const roleForRequest = selectedRole;
    const previousMessages = chatHistories[roleForRequest] ?? [];
    const userMessage: ChatMessage = { role: "user", content: prompt };
    const chatLogForRequest: ChatMessage[] = [...previousMessages, userMessage];

    setChatHistories((prev) => ({
      ...prev,
      [roleForRequest]: chatLogForRequest,
    }));

    setIsAwaitingResponse(true);

    axios
      .post(`${BACKEND_API_URL}/api/chat/ask`, {
        agent_id,
        active_role_id: roleForRequest,
        access_key: key,
        chat_log: chatLogForRequest,
      })
      .then((response) => {
        const agentResponse = response.data.response.response;
        const contextUsed = response.data.response.context_used;

        setChatHistories((prev) => {
          const previousMessages = prev[roleForRequest] ?? chatLogForRequest;
          const agentMessage: ChatMessage = {
            role: "agent",
            content: agentResponse,
            contextUsed: contextUsed || [],
          };
          const updatedMessages: ChatMessage[] = [
            ...previousMessages,
            agentMessage,
          ];

          return {
            ...prev,
            [roleForRequest]: updatedMessages,
          };
        });
        setIsAwaitingResponse(false);
      })
      .catch((error) => {
        console.error("Error sending prompt:", error);

        // Handle API errors with proper error messages
        if (error.response) {
          const status = error.response.status;
          const errorMessage =
            error.response.data?.message || "Unknown error occurred";

          let errorTitle = "Error";

          // Determine error title based on status code
          if (status === 401 || status === 403) {
            errorTitle = "Authentication Error";
          } else if (status === 429) {
            errorTitle = "Rate Limit Exceeded";
          } else if (status === 404) {
            errorTitle = "Model Not Found";
          } else if (status === 402) {
            errorTitle = "Insufficient Credits";
          } else if (status === 503) {
            errorTitle = "Service Error";
          } else {
            errorTitle = "Communication Error";
          }

          setApiError({
            title: errorTitle,
            message: errorMessage,
          });
        } else {
          // Network or other errors
          setApiError({
            title: "Network Error",
            message:
              "Unable to connect to the server. Please check your internet connection and try again.",
          });
        }

        setChatHistories((prev) => {
          const previousMessages = prev[roleForRequest] ?? chatLogForRequest;
          const errorMessage: ChatMessage = {
            role: "agent",
            content: "Error communicating with agent",
          };
          const updatedMessages: ChatMessage[] = [
            ...previousMessages,
            errorMessage,
          ];

          return {
            ...prev,
            [roleForRequest]: updatedMessages,
          };
        });
        setIsAwaitingResponse(false);
      });
  };

  const handleClearHistory = () => {
    if (!selectedRole) {
      return;
    }

    const greeting = `Hello! I'm ${selectedRole}. How can I help you?`;
    const greetingMessage: ChatMessage = {
      role: "agent",
      content: greeting,
    };

    setChatHistories((prev) => ({
      ...prev,
      [selectedRole]: [greetingMessage],
    }));
  };

  if (!agentInfo) {
    return (
      <main>
        <div className="flex h-screen w-full items-center justify-center">
          <div>Loading agent information...</div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="absolute top-4 left-4 z-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Role:</span>
          <RoleSelector
            roles={agentInfo.roles}
            value={selectedRole}
            onChange={setSelectedRole}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearHistory}
            disabled={!selectedRole}
          >
            Clear history
          </Button>
        </div>
      </div>
      <div className="flex h-screen w-full flex-col items-center pb-22">
        <MessagesView
          isLoading={isAwaitingResponse}
          messages={currentChatLog}
          agentName={agentInfo.name}
        />
        <ChatInput disabled={isAwaitingResponse} onSend={handleSendPrompt} />
      </div>

      {/* API Error Alert Dialog */}
      <AlertDialog
        open={apiError !== null}
        onOpenChange={(open: boolean) => !open && setApiError(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{apiError?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left whitespace-pre-wrap">
                {apiError?.message}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setApiError(null)}>
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default AgentPage;
