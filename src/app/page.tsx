"use client";

import ChatInput from "@/components/ui/user-promt";
import AgentSelector, { type Agent } from "@/components/ui/agent-selector";
import MessagesView from "@/components/ui/messages-view";
import { useState } from "react";

export default function HomePage() {
  const MOCK_AGENTS: Agent[] = [
    { id: "alpha", name: "RAGdoll Alpha" },
    { id: "beta", name: "RAGdoll Beta" },
    { id: "support", name: "Support Bot" },
  ];

  let [messageList, setMessageList] = useState(["hello"]);
  let [selectedAgent, setSelectedAgent] = useState<string>(MOCK_AGENTS[0].id);

  return (
    <main>
        <div className="absolute top-4 left-4 z-50">
            <AgentSelector agents={MOCK_AGENTS} value={selectedAgent} onChange={(id) => {
                setMessageList([]); // TODO: store message list for each agent
                setSelectedAgent(id);
            }} />
        </div>
        <div className="flex flex-col h-screen w-full items-center pb-22">
            <MessagesView messages={messageList} agentName={MOCK_AGENTS.find(a => a.id === selectedAgent)?.name} />
            <ChatInput onSend={(msg) => {
                setMessageList((prev) => [...prev, msg]);
            }} />
        </div>
        
    </main>
  );
}

