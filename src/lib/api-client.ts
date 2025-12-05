/**
 * Unified API Client
 * 
 * This client automatically routes requests to either the model-driven server
 * or the main API based on the USE_MODEL_DRIVEN_AGENT feature flag.
 */

import { USE_MODEL_DRIVEN_AGENT, getApiConfig, getEndpointUrl } from './model-driven-config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  active_role_id?: string;
}

export interface ChatResponse {
  response: string;
  agent_id: string;
  agent_name: string;
  role: string;
  contexts_used: number;
  contexts: Array<{
    document_name: string;
    chunk_index: number;
    content: string;
  }>;
}

export interface AgentRole {
  name: string;
  description: string;
  document_access?: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  roles: AgentRole[];
  llm_provider: string;
  llm_model: string;
  embedding_model: string;
  status: string;
}

export interface Document {
  id: string;
  document_name: string;
  file_size_bytes: number;
  created_at: string;
}

/**
 * API Client class that handles all backend communication
 */
export class ApiClient {
  private baseUrl: string;
  
  constructor() {
    const config = getApiConfig();
    this.baseUrl = config.baseUrl;
  }
  
  /**
   * Get agent (in model-driven mode, returns the initialized agent)
   */
  async getAgent(): Promise<Agent> {
    const config = getApiConfig();
    const url = getEndpointUrl(config.endpoints.agent);
    
    console.log('Fetching agent from:', url);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch agent:', response.status, errorText);
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Agent data received:', data);
    return data;
  }
  
  /**
   * List all agents
   */
  async listAgents(): Promise<Agent[]> {
    const config = getApiConfig();
    const url = getEndpointUrl(config.endpoints.agents);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list agents: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.agents || [];
  }
  
  /**
   * Send chat message and get response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const config = getApiConfig();
    const url = getEndpointUrl(config.endpoints.chat);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Chat request failed');
    }
    
    return response.json();
  }
  
  /**
   * Get documents for an agent
   */
  async getDocuments(agentId: string): Promise<Document[]> {
    const config = getApiConfig();
    const url = getEndpointUrl(config.endpoints.documents(agentId));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.documents || [];
  }
  
  /**
   * Create WebSocket connection for real-time chat
   */
  createChatWebSocket(agentId: string, onMessage: (data: any) => void, onError?: (error: Event) => void) {
    if (!USE_MODEL_DRIVEN_AGENT) {
      throw new Error('WebSocket chat is only available in model-driven mode');
    }
    
    const config = getApiConfig();
    const wsUrl = `${config.wsUrl}${config.endpoints.websocket(agentId)}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    return ws;
  }
  
  /**
   * Check server health
   */
  async healthCheck(): Promise<{ status: string; mode: string; agent_initialized: boolean }> {
    if (!USE_MODEL_DRIVEN_AGENT) {
      return { status: 'api-mode', mode: 'main-api', agent_initialized: false };
    }
    
    const url = getEndpointUrl('/api/health');
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export mode information
export const isModelDrivenMode = USE_MODEL_DRIVEN_AGENT;

// Helper to log mode
export function logApiMode() {
  console.log(
    USE_MODEL_DRIVEN_AGENT 
      ? '🎯 Using MODEL-DRIVEN agent server'
      : '🌐 Using MAIN API server'
  );
}
