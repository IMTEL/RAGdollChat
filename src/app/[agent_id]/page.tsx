"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";
import RoleSelector, { Role } from "@/components/ui/agent-selector";
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
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [apiError, setApiError] = useState<APIError | null>(null);

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
          const initialRole = response.data.roles[0]?.name || null;
          setSelectedRole(initialRole);
          // Set initial greeting with role name
          if (initialRole) {
            const greeting = `Hello! I'm ${initialRole}. How can I help you?`;
            setChatLog([{ role: "agent", content: greeting }]);
          }
        })
        .catch((error) => {
          console.error("Error fetching agent info:", error);
        });
    }
  }, [agent_id]);

  // Clear chat log and show new greeting when role changes
  useEffect(() => {
    if (selectedRole && agentInfo) {
      const greeting = `Hello! I'm ${selectedRole}. How can I help you?`;
      setChatLog([{ role: "agent", content: greeting }]);
    }
  }, [selectedRole]);

  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim()) return;

    setIsAwaitingResponse(true);

    const newChatLog: ChatMessage[] = [
      ...chatLog,
      { role: "user", content: prompt },
    ];

    setChatLog(newChatLog);

    axios
      .post("http://localhost:8000/api/chat/ask", {
        agent_id,
        active_role_id: selectedRole,
        access_key: key,
        chat_log: newChatLog,
      })
      .then((response) => {
        const agentResponse = response.data.response.response;
        const contextUsed = response.data.response.context_used;

        const updatedChatLog: ChatMessage[] = [
          ...newChatLog,
          {
            role: "agent",
            content: agentResponse,
            contextUsed: contextUsed || [],
          },
        ];

        setChatLog(updatedChatLog);
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

        setChatLog((prev) => [
          ...prev,
          { role: "agent", content: "Error communicating with agent" },
        ]);
        setIsAwaitingResponse(false);
      });
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
        <RoleSelector
          roles={agentInfo.roles}
          value={selectedRole}
          onChange={setSelectedRole}
        />
      </div>
      <div className="flex h-screen w-full flex-col items-center pb-22">
        <MessagesView
          isLoading={isAwaitingResponse}
          messages={chatLog}
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
