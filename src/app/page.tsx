"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { USE_MODEL_DRIVEN_AGENT } from "@/lib/model-driven-config";

// async function sendToAgent(message: string, agentId: string): Promise<string> {
//     const requestBody = {
//         scene_name: "test_scene",
//         user_information: ["I am a test user."],
//         progress: [
//             {
//                 taskName: "learning_basics",
//                 description: "Learning basic concepts",
//                 status: "started",
//                 userId: "test_user",
//                 subtaskProgress: [],
//             }
//         ],
//         user_actions: ["asked_question"],
//         NPC: 1,
//         chatLog: [
//             {
//                 role: "user",
//                 content: message
//             }
//         ]
//     };

//     try {
//         const response = await fetch("http://localhost:8000/ask-simple", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(requestBody),
//         });

//         if (!response.ok) {
//             throw new Error(`Error: ${response.status} ${response.statusText}`);
//         }

//         const data = await response.json();

//         return data.response || "No response from agent";
//     } catch (error) {
//         console.error("Failed to send message to agent:", error);
//         return "Error communicating with agent";
//     }
// }

// export default function HomePage() {
//   const MOCK_AGENTS: Role[] = [
//     { id: "alpha", name: "RAGdoll Alpha", greeting: "This page is deprecated. Use the agent-specific pages instead (/[agent_id])." },
//     { id: "beta", name: "RAGdoll Beta", greeting: "Hello, I'm RAGdoll Beta! What can I assist you with?" },
//     { id: "support", name: "Support Bot", greeting: "Hello, I'm Support Bot! Ask me anything!" },
//   ];

//   let [messageList, setMessageList] = useState(MOCK_AGENTS[0].greeting ? [MOCK_AGENTS[0].greeting] : []);
//   let [selectedAgent, setSelectedAgent] = useState<string>(MOCK_AGENTS[0].id);
//   let [isAwaitingResponse, setIsAwaitingResponse] = useState(false);

//   return (
//     <main>
//         <div className="absolute top-4 left-4 z-50">
//             <RoleSelector agents={MOCK_AGENTS} value={selectedAgent} onChange={(id) => {
//                 setMessageList(MOCK_AGENTS.find(a => a.id === id)?.greeting ? [MOCK_AGENTS.find(a => a.id === id)?.greeting!] : []);
//                 setSelectedAgent(id);
//             }} />
//         </div>
//         <div className="flex flex-col h-screen w-full items-center pb-22">
//             <MessagesView isLoading={isAwaitingResponse} messages={messageList} agentName={MOCK_AGENTS.find(a => a.id === selectedAgent)?.name} />
//             <ChatInput disabled={isAwaitingResponse} onSend={(msg) => {
//                 setIsAwaitingResponse(true);
//                 setMessageList(prev => [...prev, msg]);
//                 sendToAgent(msg, selectedAgent).then((response) => {
//                     setMessageList(prev => [...prev, response]);
//                     setIsAwaitingResponse(false);
//                 });
//             }} />
//         </div>
//     </main>
//   );
// }

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // If model-driven mode is enabled, redirect to /agent (any path will work)
    if (USE_MODEL_DRIVEN_AGENT) {
      router.push('/agent');
    }
  }, [router]);

  return (
    <main>
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <p>Please go to an agent-specific page (/[agent_id])</p>
        </div>
      </div>
    </main>
  );
}
