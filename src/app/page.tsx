"use client";

import ChatInput from "@/components/ui/user-promt";
import AgentSelector, { type Agent } from "@/components/ui/agent-selector";
import MessagesView from "@/components/ui/messages-view";
import { useState, useEffect } from "react";
//import { useRouter } from "next/router";
import { useSearchParams } from "next/navigation";

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
    { id: "1", name: "RAGdoll Alpha", greeting: "Hello, I'm RAGdoll Alpha! How can I help you?" },
    { id: "2", name: "RAGdoll Beta", greeting: "Hello, I'm RAGdoll Beta! What can I assist you with?" },
    { id: "3", name: "Support Bot", greeting: "Hello, I'm Support Bot! Ask me anything!" },
  ];

  const [messageList, setMessageList] = useState<string[]>(MOCK_AGENTS[0].greeting ? [MOCK_AGENTS[0].greeting] : []);
  const [selectedAgent, setSelectedAgent] = useState<string>(MOCK_AGENTS[0].id);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

  //const router = useRouter();
  //const { agent } = router.query;
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");

  useEffect(() => {
    if (agent && typeof agent === "string") {
      setSelectedAgent(agent);
      const selectedAgentData = MOCK_AGENTS.find(a => a.id === agent);
      if (selectedAgentData?.greeting) {
        setMessageList([selectedAgentData.greeting]);
      }
    }
  }, [agent]);

  return (
    <main>
      <div className="absolute top-4 left-4 z-50">
        <AgentSelector
          agents={MOCK_AGENTS}
          value={selectedAgent}
          onChange={(id) => {
            const selectedAgentData = MOCK_AGENTS.find(a => a.id === id);
            if (selectedAgentData?.greeting) {
              setMessageList([selectedAgentData.greeting]);
            }
            setSelectedAgent(id);
          }}
        />
      </div>
      <div className="flex flex-col h-screen w-full items-center pb-22">
        <MessagesView 
          isLoading={isAwaitingResponse} 
          messages={messageList} 
          agentName={MOCK_AGENTS.find(a => a.id === selectedAgent)?.name} 
        />
        <ChatInput 
          disabled={isAwaitingResponse} 
          onSend={(msg) => {
            setIsAwaitingResponse(true);
            setMessageList(prev => [...prev, msg]);
            sendToAgent(msg, selectedAgent).then((response) => {
              setMessageList(prev => [...prev, response]);
              setIsAwaitingResponse(false);
            });
          }} 
        />
      </div>
    </main>
  );
}
