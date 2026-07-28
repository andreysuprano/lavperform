export interface ToolExecutionContext {
  companyId: string;
  agentId: string;
  senderPhone: string;
  conversationId: string;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: object;
  execute(input: unknown, context: ToolExecutionContext): Promise<unknown>;
}
