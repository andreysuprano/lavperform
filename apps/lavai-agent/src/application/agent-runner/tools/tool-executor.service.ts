import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool-registry';
import type { LlmToolCall } from '../ports/llm-provider.port';
import type { AgentTool, ToolExecutionContext } from './tool.interface';

export interface ToolResult {
  tool_call_id: string;
  content: string;
  errorMessage?: string;
}

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(private readonly registry: ToolRegistry) {}

  /**
   * Executa as tool calls retornadas pelo LLM.
   * `extraTools` são tools adicionais (ex: MCP) não registradas no ToolRegistry global.
   */
  async execute(
    toolCalls: LlmToolCall[],
    context: ToolExecutionContext,
    extraTools: AgentTool[] = [],
  ): Promise<ToolResult[]> {
    const extraMap = new Map<string, AgentTool>(extraTools.map((t) => [t.name, t]));

    return Promise.all(
      toolCalls.map(async (call) => {
        const tool = this.registry.get(call.function.name) ?? extraMap.get(call.function.name);

        if (!tool) {
          this.logger.warn(`Tool não encontrado: ${call.function.name}`);
          return {
            tool_call_id: call.id,
            content: JSON.stringify({
              error: `Tool "${call.function.name}" não encontrado`,
            }),
          };
        }

        try {
          const input = JSON.parse(call.function.arguments) as unknown;
          const result = await tool.execute(input, context);
          this.logger.debug(`[Tool] ${call.function.name} executado com sucesso`);
          return { tool_call_id: call.id, content: JSON.stringify(result) };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(`[Tool] Erro ao executar ${call.function.name}:`, err);
          return {
            tool_call_id: call.id,
            content: JSON.stringify({ error: errorMessage }),
            errorMessage,
          };
        }
      }),
    );
  }
}
