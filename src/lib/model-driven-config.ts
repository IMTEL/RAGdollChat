/**
 * Model-Driven Agent Configuration
 * 
 * This file configures the frontend to use the model-driven agent server
 * instead of the main API when the feature flag is enabled.
 */

// Feature flag - set this in .env.local
export const USE_MODEL_DRIVEN_AGENT = process.env.NEXT_PUBLIC_USE_MODEL_DRIVEN_AGENT === 'true';

// Model-driven server configuration
export const MODEL_DRIVEN_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_MODEL_DRIVEN_BASE_URL || 'http://localhost:8001',
  wsUrl: process.env.NEXT_PUBLIC_MODEL_DRIVEN_WS_URL || 'ws://localhost:8001',
  
  endpoints: {
    agent: '/api/agent',
    agents: '/api/agents',
    chat: '/api/chat',
    websocket: '/ws/chat',
    documents: '/api/documents',
    health: '/api/health',
  }
};

// Main API configuration (existing)
export const MAIN_API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  endpoints: {
    agent: (agentId: string) => `/agent/${agentId}`,
    agents: '/agents',
    chat: '/chat',
    documents: (agentId: string) => `/documents/agent/${agentId}`,
  }
};

/**
 * Get the current API configuration based on feature flag
 */
export function getApiConfig() {
  return USE_MODEL_DRIVEN_AGENT ? MODEL_DRIVEN_CONFIG : MAIN_API_CONFIG;
}

/**
 * Get the full URL for an endpoint
 */
export function getEndpointUrl(endpoint: string) {
  const config = getApiConfig();
  return `${config.baseUrl}${endpoint}`;
}

/**
 * Log the current mode for debugging
 */
if (typeof window !== 'undefined') {
  console.log('🎯 Agent Mode:', USE_MODEL_DRIVEN_AGENT ? 'MODEL-DRIVEN' : 'API-DRIVEN');
  if (USE_MODEL_DRIVEN_AGENT) {
    console.log('📡 Model-Driven Server:', MODEL_DRIVEN_CONFIG.baseUrl);
  }
}
