import { Injectable, Logger } from '@nestjs/common';
import type { AgentTool } from './tool.interface';
import type { LlmTool } from '../ports/llm-provider.port';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Tool registrado: ${tool.name}`);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /** Serializa as tools para o formato esperado pela API OpenAI / OpenRouter. */
  toOpenAiTools(): LlmTool[] {
    return this.getAll().map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }
}
