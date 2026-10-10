import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool-registry';
import type { LlmToolCall } from '../ports/llm-provider.port';
import type { AgentTool, ToolExecutionContext } from './tool.interface';

export interface ToolResult {
  tool_call_id: string;
  content: string;
  errorMessage?: string;
}

const SIDE_EFFECT_TOOLS = new Set(['request_human_help', 'end_conversation']);

const TOOL_FAILURE_FOR_MODEL = JSON.stringify({
  error:
    'Não foi possível concluir essa ação agora. Diga ao cliente, em uma frase simples, que não deu certo desta vez e peça para tentar de novo.',
});

export function isTransientToolError(error: unknown): boolean {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  if (status === 408 || status === 429 || (status !== undefined && Number.isFinite(status) && status >= 500)) {
    return true;
  }
  if (status !== undefined && Number.isFinite(status)) return false;

  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket|network|fetch failed|demorou demais|429|502|503|504/i.test(
    message,
  );
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

        let input: unknown;
        try {
          input = JSON.parse(call.function.arguments) as unknown;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(`[Tool] Argumentos inválidos em ${call.function.name}: ${errorMessage}`);
          return {
            tool_call_id: call.id,
            content: TOOL_FAILURE_FOR_MODEL,
            errorMessage,
          };
        }

        const attempts = SIDE_EFFECT_TOOLS.has(call.function.name) ? 1 : this.toolAttempts();
        let lastError: unknown;
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const result = await this.withTimeout(
              tool.execute(input, context),
              this.toolTimeoutMs(),
            );
            this.logger.debug(`[Tool] ${call.function.name} executado com sucesso`);
            return { tool_call_id: call.id, content: JSON.stringify(result) };
          } catch (err) {
            lastError = err;
            const errorMessage = err instanceof Error ? err.message : String(err);
            const canRetry = attempt < attempts && isTransientToolError(err);
            this.logger.error(
              `[Tool] Erro ao executar ${call.function.name} (tentativa ${attempt}/${attempts}): ${errorMessage}`,
            );
            if (!canRetry) break;
            this.logger.warn(`[Tool] Repetindo ${call.function.name}`);
          }
        }

        const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        return {
          tool_call_id: call.id,
          content: TOOL_FAILURE_FOR_MODEL,
          errorMessage,
        };
      }),
    );
  }

  private toolTimeoutMs(): number {
    const value = Number(process.env.AGENT_TOOL_TIMEOUT_MS ?? 20_000);
    return Number.isFinite(value) && value > 0 ? value : 20_000;
  }

  private toolAttempts(): number {
    const value = Number(process.env.AGENT_TOOL_ATTEMPTS ?? 2);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 2;
  }

  private withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('A ferramenta demorou demais')), ms);
      work.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  }
}
