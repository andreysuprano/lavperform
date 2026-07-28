import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CONVERSATION_REPOSITORY } from '../../webhook/ports/conversation.repository.port';
import type {
  ConversationData,
  ConversationRepositoryPort,
} from '../../webhook/ports/conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { KNOWLEDGE_CHUNK_REPOSITORY } from '../../knowledge/ports/knowledge-chunk.repository.port';
import type {
  KnowledgeChunkRepositoryPort,
  KnowledgeChunkWithScore,
} from '../../knowledge/ports/knowledge-chunk.repository.port';
import { EMBEDDING_PORT } from '../../knowledge/ports/embedding.port';
import type { EmbeddingPort } from '../../knowledge/ports/embedding.port';
import { LLM_PROVIDER_PORT } from '../ports/llm-provider.port';
import type {
  LlmCompletionResponse,
  LlmMessage,
  LlmProviderPort,
} from '../ports/llm-provider.port';
import { MESSAGE_SENDER_PORT } from '../ports/message-sender.port';
import type { MessageSenderPort, SendContext } from '../ports/message-sender.port';
import { PromptBuilderService } from './prompt-builder.service';
import { ToolRegistry } from '../tools/tool-registry';
import { ToolExecutorService } from '../tools/tool-executor.service';
import { SearchKnowledgeTool } from '../tools/builtin/search-knowledge.tool';
import { GetDatetimeTool } from '../tools/builtin/get-datetime.tool';
import { EndConversationTool } from '../tools/builtin/end-conversation.tool';
import { RequestHumanHelpTool } from '../tools/builtin/request-human-help.tool';
import { McpToolLoaderService } from '../tools/mcp/mcp-tool-loader.service';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { NormalizedAgentPrompt } from '../../webhook/types/normalized-agent-prompt.types';
import { AGENT_RUN_TRACKER_PORT } from '../../agent-trace/ports/agent-run-tracker.port';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';

@Injectable()
export class AgentRunnerService implements OnModuleInit {
  private readonly logger = new Logger(AgentRunnerService.name);
  private readonly maxToolIterations = parseInt(
    process.env.AGENT_MAX_TOOL_ITERATIONS ?? '10',
    10,
  );
  private readonly ragTopK = parseInt(process.env.AGENT_RAG_TOP_K ?? '5', 10);
  private readonly ragThreshold = parseFloat(
    process.env.AGENT_RAG_SIMILARITY_THRESHOLD ?? '0.7',
  );

  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: ConversationRepositoryPort,
    @Inject(KNOWLEDGE_CHUNK_REPOSITORY)
    private readonly chunkRepo: KnowledgeChunkRepositoryPort,
    @Inject(EMBEDDING_PORT)
    private readonly embeddingService: EmbeddingPort,
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
    private readonly promptBuilder: PromptBuilderService,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: ToolExecutorService,
    private readonly searchKnowledgeTool: SearchKnowledgeTool,
    private readonly getDatetimeTool: GetDatetimeTool,
    private readonly endConversationTool: EndConversationTool,
    private readonly requestHumanHelpTool: RequestHumanHelpTool,
    private readonly mcpToolLoader: McpToolLoaderService,
    @Inject(AGENT_RUN_TRACKER_PORT)
    private readonly tracker: AgentRunTrackerPort,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(this.searchKnowledgeTool);
    this.toolRegistry.register(this.getDatetimeTool);
    this.toolRegistry.register(this.endConversationTool);
    this.toolRegistry.register(this.requestHumanHelpTool);
  }

  async run(
    prompt: NormalizedAgentPrompt,
    conversation: ConversationData,
    agent: AgentWithConfigsData,
  ): Promise<void> {
    const windowSize = agent.memoryConfig?.windowSize ?? 10;
    const modelConfig = agent.modelConfig;
    const model = modelConfig?.modelName ?? 'openai/gpt-4o';

    this.logger.log(
      `[Runner] Iniciando execução | agente=${agent.id} | conv=${conversation.id} | model=${model} | sender=${prompt.context.senderPhone}`,
    );
    this.logger.debug(
      `[Runner] Mensagem do usuário: "${prompt.userMessage.slice(0, 200)}${prompt.userMessage.length > 200 ? '...' : ''}"`,
    );

    const runId = await this.tracker.startRun({
      agentId: agent.id,
      companyId: conversation.companyId,
      conversationId: conversation.id,
      inputPrompt: prompt.userMessage,
    });

    let iterations = 0;
    let totalToolCalls = 0;
    let assistantText = '';

    try {
      // 1. Carregar histórico
      const history = await this.conversationRepo.findRecentMessages(
        conversation.id,
        windowSize,
      );
      this.logger.log(`[Runner] Histórico carregado | ${history.length} mensagens | janela=${windowSize}`);

      // 2. Buscar chunks RAG
      const ragStart = Date.now();
      const ragChunks = await this.fetchRagChunks(
        prompt.userMessage,
        conversation.companyId,
      );
      const ragDuration = Date.now() - ragStart;
      this.logger.log(`[Runner] RAG concluído | ${ragChunks.length} chunk(s) recuperado(s)`);

      await this.tracker.addStep(runId, {
        stepType: 'RAG_SEARCH',
        toolName: 'rag_search',
        input: { query: prompt.userMessage },
        output: {
          chunks: ragChunks.map((c) => ({ content: c.content.slice(0, 200), score: c.score })),
          total: ragChunks.length,
        },
        durationMs: ragDuration,
        iteration: 0,
      });

      // 3. Montar prompt com contexto do remetente
      const messages: LlmMessage[] = this.promptBuilder.build(
        agent,
        history,
        ragChunks,
        prompt.userMessage,
        {
          senderName: prompt.context.senderName,
          senderPhone: prompt.context.senderPhone,
          chatId: prompt.context.chatId,
          isGroup: prompt.context.isGroup,
          groupName: prompt.context.groupName,
        },
      );
      this.logger.log(`[Runner] Prompt montado | ${messages.length} mensagem(s) para o LLM`);

      // 4. Carregar tools MCP dinâmicas do agente
      const mcpSessions = await this.mcpToolLoader.openSessionsForAgent(agent.id);
      const mcpTools = mcpSessions.flatMap((s) => s.tools);
      if (mcpTools.length > 0) {
        this.logger.log(`[Runner] MCP: ${mcpTools.length} tool(s) carregada(s) de ${mcpSessions.length} servidor(es)`);
      }

      const mcpToolNames = new Set(mcpTools.map((t) => t.name));
      let builtinTools = this.toolRegistry.toOpenAiTools();
      if (!agent.journeyConfig?.enabled) {
        builtinTools = builtinTools.filter((t) => t.function.name !== 'request_human_help');
      }
      const mcpOpenAiTools = mcpTools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));
      const tools = [...builtinTools, ...mcpOpenAiTools];

      const toolContext = {
        companyId: conversation.companyId,
        agentId: agent.id,
        senderPhone: conversation.userPhone,
        conversationId: conversation.id,
      };

      // 5. Loop LLM + tool calling
      this.logger.log(`[Runner] Iniciando chamada ao LLM (iteração 1)`);
      const llmStart = Date.now();
      let response: LlmCompletionResponse = await this.llm.complete({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: modelConfig?.temperature,
        maxTokens: modelConfig?.maxTokens,
        topP: modelConfig?.topP,
        frequencyPenalty: modelConfig?.frequencyPenalty,
        presencePenalty: modelConfig?.presencePenalty,
      });

      await this.tracker.addStep(runId, {
        stepType: 'LLM_CALL',
        toolName: model,
        input: { messageCount: messages.length, toolCount: tools.length },
        output: { finishReason: response.finishReason, toolCallCount: response.toolCalls.length, contentLength: (response.content ?? '').length },
        durationMs: Date.now() - llmStart,
        iteration: 0,
      });

      try {
        while (
          response.finishReason === 'tool_calls' &&
          response.toolCalls.length > 0 &&
          iterations < this.maxToolIterations
        ) {
          this.logger.log(
            `[Runner] Tool calls (iter ${iterations + 1}): ${response.toolCalls.map((tc) => tc.function.name).join(', ')}`,
          );

          messages.push({
            role: 'assistant',
            content: response.content,
            tool_calls: response.toolCalls,
          });

          const toolCallStart = Date.now();
          const toolResults = await this.toolExecutor.execute(
            response.toolCalls,
            toolContext,
            mcpTools,
          );
          const toolCallDuration = Date.now() - toolCallStart;
          totalToolCalls += toolResults.length;

          for (let i = 0; i < toolResults.length; i++) {
            const call = response.toolCalls[i];
            const result = toolResults[i];
            const isMcp = mcpToolNames.has(call.function.name);

            await this.tracker.addStep(runId, {
              stepType: isMcp ? 'MCP_TOOL_CALL' : 'TOOL_CALL',
              toolName: call.function.name,
              input: this.safeParseJson(call.function.arguments),
              output: this.safeParseJson(result.content),
              errorMessage: result.errorMessage,
              durationMs: Math.round(toolCallDuration / toolResults.length),
              iteration: iterations + 1,
            });

            messages.push({
              role: 'tool',
              content: result.content,
              tool_call_id: result.tool_call_id,
            });
          }

          this.logger.log(`[Runner] Reinvocando LLM com resultados das tools (iteração ${iterations + 2})`);
          const llmIterStart = Date.now();
          response = await this.llm.complete({
            model,
            messages,
            tools: tools.length > 0 ? tools : undefined,
            temperature: modelConfig?.temperature,
            maxTokens: modelConfig?.maxTokens,
            topP: modelConfig?.topP,
            frequencyPenalty: modelConfig?.frequencyPenalty,
            presencePenalty: modelConfig?.presencePenalty,
          });

          await this.tracker.addStep(runId, {
            stepType: 'LLM_CALL',
            toolName: model,
            input: { messageCount: messages.length, toolCount: tools.length },
            output: { finishReason: response.finishReason, toolCallCount: response.toolCalls.length, contentLength: (response.content ?? '').length },
            durationMs: Date.now() - llmIterStart,
            iteration: iterations + 1,
          });

          iterations++;
        }
      } finally {
        await this.mcpToolLoader.closeSessions(mcpSessions);
      }

      if (iterations >= this.maxToolIterations) {
        this.logger.warn(`[Runner] Limite de ${this.maxToolIterations} iterações de tool calls atingido | conv=${conversation.id}`);
      }

      assistantText = response.content ?? '';
      this.logger.log(
        `[Runner] Loop LLM concluído | iterações=${iterations} | finishReason=${response.finishReason} | resposta=${assistantText.length} chars`,
      );

      // 7. Persistir resposta do assistente
      await this.conversationRepo.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: assistantText,
      });

      // 8. Enviar resposta via provider de mensagens (com assinatura se configurada)
      if (assistantText.trim()) {
        const signature = agent.persona?.messageSignature?.trim() ?? '';
        const sendCtx: SendContext = {
          instanceName: conversation.instanceName,
          instanceToken: conversation.instanceToken,
          chatId: conversation.chatId,
        };

        const chunks = this.splitIntoChunks(assistantText, signature);

        for (let i = 0; i < chunks.length; i++) {
          await this.messageSender.send(sendCtx, { type: 'text', text: chunks[i] });
          // Pequena pausa entre partes para garantir a ordem de entrega
          if (i < chunks.length - 1) {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
          }
        }

        this.logger.log(
          `[Runner] Resposta enviada | conv=${conversation.id} | chars=${assistantText.length} | partes=${chunks.length}`,
        );
      } else {
        this.logger.warn(
          `[Runner] Resposta vazia do LLM | conv=${conversation.id}`,
        );
      }

      await this.tracker.completeRun(runId, assistantText, iterations, totalToolCalls);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Runner] Execução falhou | conv=${conversation.id} | erro=${errorMessage}`, err);

      await this.tracker.addStep(runId, {
        stepType: 'ERROR',
        errorMessage,
        iteration: iterations,
      });
      await this.tracker.failRun(runId, errorMessage);

      throw err;
    }
  }

  /**
   * Divide o texto em partes respeitando o limite de caracteres do WhatsApp (4096).
   * A assinatura é acrescentada apenas na última parte.
   * A divisão ocorre em quebras de parágrafo (duplo \n) e, como fallback, em \n simples.
   */
  private splitIntoChunks(text: string, signature: string): string[] {
    const MAX_CHARS = 4000; // margem de segurança abaixo do limite de 4096
    const signatureSuffix = signature ? `\n\n${signature}` : '';
    const maxBodyChars = MAX_CHARS - signatureSuffix.length;

    // Texto cabe numa única mensagem → retorno direto
    if (text.length + signatureSuffix.length <= MAX_CHARS) {
      return [signature ? `${text}${signatureSuffix}` : text];
    }

    // Divide em parágrafos para não quebrar no meio de uma frase
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
      const separator = current ? '\n\n' : '';
      const candidate = `${current}${separator}${para}`;

      if (candidate.length <= maxBodyChars) {
        current = candidate;
      } else {
        // Parágrafo sozinho ainda cabe: salva acumulado e começa novo
        if (current) chunks.push(current);

        // Parágrafo em si é grande demais: divide em linhas simples
        if (para.length > maxBodyChars) {
          const lines = para.split('\n');
          current = '';
          for (const line of lines) {
            const lineCandidate = current ? `${current}\n${line}` : line;
            if (lineCandidate.length <= maxBodyChars) {
              current = lineCandidate;
            } else {
              if (current) chunks.push(current);
              // Linha ainda maior que o limite: divide por palavras
              current = this.splitLongLine(line, maxBodyChars, chunks);
            }
          }
        } else {
          current = para;
        }
      }
    }

    if (current) chunks.push(current);

    // Acrescenta assinatura somente no último chunk
    if (signature && chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}${signatureSuffix}`;
    }

    return chunks.filter((c) => c.trim().length > 0);
  }

  /** Divide uma linha muito longa por palavras, empurrando os chunks cheios para o array. */
  private splitLongLine(line: string, maxChars: number, chunks: string[]): string {
    const words = line.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) chunks.push(current);
        current = word;
      }
    }
    return current;
  }

  private safeParseJson(value: string): unknown {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private async fetchRagChunks(
    userMessage: string,
    companyId: string,
  ): Promise<KnowledgeChunkWithScore[]> {
    try {
      const vector = await this.embeddingService.embed(userMessage);
      const chunks = await this.chunkRepo.searchSimilar(
        vector,
        companyId,
        this.ragTopK,
        this.ragThreshold,
      );
      this.logger.debug(`[RAG] ${chunks.length} chunks encontrados`);
      return chunks;
    } catch (err) {
      this.logger.warn('[RAG] Falha ao buscar chunks (continuando sem RAG):', err);
      return [];
    }
  }
}
