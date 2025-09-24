"use client";

import ChatInput from "@/components/ui/user-promt";
import AgentSelector, { type Agent } from "@/components/ui/agent-selector";

export default function HomePage() {
  const MOCK_AGENTS: Agent[] = [
    { id: "alpha", name: "RAGdoll Alpha" },
    { id: "beta", name: "RAGdoll Beta" },
    { id: "support", name: "Support Bot" },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="fixed top-4 left-4">
        
        <AgentSelector agents={MOCK_AGENTS} />
        <ChatInput onSend={(msg) => console.log("send:", msg)} />
      </div>
    </main>
  );
}

