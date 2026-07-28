export const LLM_PROVIDER_PORT = Symbol('LLM_PROVIDER_PORT');

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: LlmToolCall[];
  name?: string;
}

export interface LlmToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LlmTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}

export interface LlmCompletionRequest {
  model: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LlmCompletionResponse {
  content: string | null;
  toolCalls: LlmToolCall[];
  finishReason: string;
}

export interface LlmProviderPort {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}
