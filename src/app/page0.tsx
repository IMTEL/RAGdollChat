"use client";

import ChatInput from "@/components/ui/user-promt";
import AgentSelector, { type Agent } from "@/components/ui/agent-selector";
import MessagesView from "@/components/ui/messages-view";
import { useState } from "react";


async function sendToAgent(message: string, agentId: string): Promise<string> {
    const requestBody = {
        scene_name: "test_scene",
        user_information: ["I am a test user."],
        progress: [
            {
                taskName: "learning_basics",
                description: "Learning basic concepts",
                status: "started",
                userId: "test_user",
                subtaskProgress: [],
            }
        ],
        user_actions: ["asked_question"],
        NPC: 1,
        chatLog: [
            {
                role: "user",
                content: message
            }
        ]
    };

    try {
        const response = await fetch("http://localhost:8000/ask-simple", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return data.response || "No response from agent";
    } catch (error) {
        console.error("Failed to send message to agent:", error);
        return "Error communicating with agent";
    }
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

