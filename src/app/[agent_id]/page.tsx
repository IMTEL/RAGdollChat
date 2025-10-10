"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";
import RoleSelector, { Role } from "@/components/ui/agent-selector";

const BACKEND_API_URL = process.env.BACKEND_API_URL|| "http://localhost:8000";

interface AgentInfo {
  name: string
  roles: Role[]
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

const AgentPage = () => {
  const params = useParams();
  const agent_id = params.agent_id as string;

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(agentInfo?.roles[0]?.name || null);

  useEffect(() => {
    if (agent_id) {
      // Fetch agent information
      console.log("Fetching agent info for ID:", agent_id);
      axios
        .get(`${BACKEND_API_URL}/agents/${agent_id}`)
        .then((response) => {
          console.log(response.data);
          setAgentInfo(response.data);
          setSelectedRole(response.data.roles[0]?.name || null);
          // Set initial greeting if available
          const greeting = `Hello! I'm ${response.data.name}. How can I help you?`;
          setChatLog([{ role: "agent", content: greeting }]);
        })
        .catch((error) => {
          console.error("Error fetching agent info:", error);
        });
    }
  }, [agent_id]);

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
        active_role_ids: [], // TODO: handle roles properly
        access_key: "key1", // TODO: handle access keys properly
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
            contextUsed: contextUsed || []
          },
        ];

        setChatLog(updatedChatLog);
        setIsAwaitingResponse(false);
      })
      .catch((error) => {
        console.error("Error sending prompt:", error);
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
        <RoleSelector roles={agentInfo.roles} value={selectedRole} onChange={setSelectedRole} />
      </div>
      <div className="flex flex-col h-screen w-full items-center pb-22">
        <MessagesView
          isLoading={isAwaitingResponse}
          messages={chatLog}
          agentName={agentInfo.name}
        />
        <ChatInput disabled={isAwaitingResponse} onSend={handleSendPrompt} />
      </div>
    </main>
  );
};

export default AgentPage;
