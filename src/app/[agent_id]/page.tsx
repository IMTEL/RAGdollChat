"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Button } from '@/components/ui/button';

interface AgentInfo {
  name: string;
  roles: string[];
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

const AgentPage = () => {
  const params = useParams();
  const agent_id = params.agent_id as string;

  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState<string>('');

  useEffect(() => {
    if (agent_id) {
      // Fetch agent information
      console.log('Fetching agent info for ID:', agent_id); // Log the agent_id
      axios.get(`http://localhost:8000/agents/${agent_id}`)
        .then((response) => {
          setAgentInfo(response.data);
        })
        .catch((error) => {
          console.error('Error fetching agent info:', error);
        });
    }
  }, [agent_id]);

  const handleSendPrompt = () => {
    if (!prompt.trim()) return;

    const newChatLog: ChatMessage[] = [
      ...chatLog,
      { role: 'user', content: prompt },
    ];

    axios.post('http://localhost:8000/api/chat/ask', {
      agent_id,
    //   active_role_ids: agentInfo?.roles || [],
      active_role_ids: [],
      access_key: 'key1', // Replace with actual access key if required
      chat_log: newChatLog,
    })
      .then((response) => {
        const agentResponse = typeof response.data.response === 'string'
          ? response.data.response
          : JSON.stringify(response.data.response); // Convert object to string if needed

        setChatLog([...newChatLog, { role: 'agent', content: agentResponse }]);
        setPrompt('');
      })
      .catch((error) => {
        console.error('Error sending prompt:', error);
      });
  };

  if (!agentInfo) {
    return <div>Loading agent information...</div>;
  }

  return (
    <div>
      <h1>Agent: {agentInfo.name}</h1>
      <div>
        <h2>Chat</h2>
        <div>
          {chatLog.map((message, index) => (
            <div key={index}>
              <strong>{message.role}:</strong> {message.content}
            </div>
          ))}
        </div>
        <AutoTextarea
          value={prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
          placeholder="Write your prompt here..."
        />
        <Button onClick={handleSendPrompt}>Send</Button>
      </div>
    </div>
  );
};

export default AgentPage;