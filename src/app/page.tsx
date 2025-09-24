"use client";

import ChatInput from "@/components/ui/user-promt";
import AgentSelector, { type Agent } from "@/components/ui/agent-selector";
import MessagesView from "@/components/ui/messages-view";
import { useState } from "react";

// add logic for communicating with RAGdoll here!
function sendToAgent(message: string, agentId: string): Promise<string> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("dummy response from " + agentId);
        }, 1000);
    });
}

export default function HomePage() {
  const MOCK_AGENTS: Agent[] = [
    { id: "alpha", name: "RAGdoll Alpha", greeting: "Hello, I'm RAGdoll Alpha! How can I help you?" },
    { id: "beta", name: "RAGdoll Beta", greeting: "Hello, I'm RAGdoll Beta! What can I assist you with?" },
    { id: "support", name: "Support Bot", greeting: "Hello, I'm Support Bot! Ask me anything!" },
  ];

  let [messageList, setMessageList] = useState(MOCK_AGENTS[0].greeting ? [MOCK_AGENTS[0].greeting] : []);
  let [selectedAgent, setSelectedAgent] = useState<string>(MOCK_AGENTS[0].id);
  let [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  return (
    <main>
        <div className="absolute top-4 left-4 z-50">
            <AgentSelector agents={MOCK_AGENTS} value={selectedAgent} onChange={(id) => {
                setMessageList(MOCK_AGENTS.find(a => a.id === id)?.greeting ? [MOCK_AGENTS.find(a => a.id === id)?.greeting!] : []);
                setSelectedAgent(id);
            }} />
        </div>
        <div className="flex flex-col h-screen w-full items-center pb-22">
            <MessagesView isLoading={isAwaitingResponse} messages={messageList} agentName={MOCK_AGENTS.find(a => a.id === selectedAgent)?.name} />
            <ChatInput disabled={isAwaitingResponse} onSend={(msg) => {
                setIsAwaitingResponse(true);
                setMessageList(prev => [...prev, msg]);
                sendToAgent(msg, selectedAgent).then((response) => {
                    setMessageList(prev => [...prev, response]);
                    setIsAwaitingResponse(false);
                });
            }} />
        </div>
        
    </main>
  );
}

