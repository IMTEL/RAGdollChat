"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";

interface AgentInfo {
  name: string;
  roles: string[];
}

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

const AgentPage = () => {
  const params = useParams();
  const agent_id = params.agent_id as string;

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [messageList, setMessageList] = useState<string[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  useEffect(() => {
    if (agent_id) {
      // Fetch agent information
      console.log("Fetching agent info for ID:", agent_id);
      axios
        .get(`http://localhost:8000/agents/${agent_id}`)
        .then((response) => {
          setAgentInfo(response.data);
          // Set initial greeting if available
          const greeting = `Hello! I'm ${response.data.name}. How can I help you?`;
          setMessageList([greeting]);
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

        const updatedChatLog: ChatMessage[] = [
          ...newChatLog,
          { role: "agent", content: agentResponse },
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

  useEffect(() => {
    setMessageList(chatLog.map((message) => message.content));
  }, [chatLog]);

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
      <div className="flex flex-col h-screen w-full items-center pb-22">
        <MessagesView
          isLoading={isAwaitingResponse}
          messages={messageList}
          agentName={agentInfo.name}
        />
        <ChatInput disabled={isAwaitingResponse} onSend={handleSendPrompt} />
      </div>
    </main>
  );
};

export default AgentPage;
