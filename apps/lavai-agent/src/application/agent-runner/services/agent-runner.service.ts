import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CONVERSATION_REPOSITORY } from '../../webhook/ports/conversation.repository.port';
import type {
  ConversationData,
  ConversationMessageData,
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
import { PromptBuilderService, type SenderContext } from './prompt-builder.service';
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

export interface CompleteAgentTurnInput {
  agent: AgentWithConfigsData;
  conversation: ConversationData;
  history: ConversationMessageData[];
  userMessage: string;
  sender: SenderContext;
}

interface LoopProgress {
  iterations: number;
  totalToolCalls: number;
  assistantText: string;
}

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

  async complete(input: CompleteAgentTurnInput): Promise<string> {
    const runId = await this.tracker.startRun({
      agentId: input.agent.id,
      companyId: input.conversation.companyId,
      conversationId: input.conversation.id,
      inputPrompt: input.userMessage,
    });
    const progress: LoopProgress = { iterations: 0, totalToolCalls: 0, assistantText: '' };

    try {
      await this.executeLoop({ ...input, runId, progress });
      await this.tracker.completeRun(
        runId,
        progress.assistantText,
        progress.iterations,
        progress.totalToolCalls,
      );
      return progress.assistantText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.tracker.addStep(runId, {
        stepType: 'ERROR',
        errorMessage,
        iteration: progress.iterations,
      });
      await this.tracker.failRun(runId, errorMessage);
      throw err;
    }
  }

  async run(
    prompt: NormalizedAgentPrompt,
    conversation: ConversationData,
    agent: AgentWithConfigsData,
  ): Promise<void> {
    const windowSize = agent.memoryConfig?.windowSize ?? 10;
    const model = agent.modelConfig?.modelName ?? 'openai/gpt-4o';

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

    const progress: LoopProgress = { iterations: 0, totalToolCalls: 0, assistantText: '' };

    try {
      const history = await this.conversationRepo.findRecentMessages(
        conversation.id,
        windowSize,
      );
      this.logger.log(`[Runner] Histórico carregado | ${history.length} mensagens | janela=${windowSize}`);

      await this.executeLoop({
        runId,
        agent,
        conversation,
        history,
        userMessage: prompt.userMessage,
        sender: {
          senderName: prompt.context.senderName,
          senderPhone: prompt.context.senderPhone,
          chatId: prompt.context.chatId,
          isGroup: prompt.context.isGroup,
          groupName: prompt.context.groupName,
        },
        progress,
      });

      const assistantText = progress.assistantText;

      await this.conversationRepo.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: assistantText,
      });

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

      await this.tracker.completeRun(
        runId,
        progress.assistantText,
        progress.iterations,
        progress.totalToolCalls,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Runner] Execução falhou | conv=${conversation.id} | erro=${errorMessage}`, err);

      await this.tracker.addStep(runId, {
        stepType: 'ERROR',
        errorMessage,
        iteration: progress.iterations,
      });
      await this.tracker.failRun(runId, errorMessage);

      throw err;
    }
  }

  private async executeLoop(input: CompleteAgentTurnInput & {
    runId: string;
    progress: LoopProgress;
  }): Promise<void> {
    const { agent, conversation, history, userMessage, sender, runId, progress } = input;
    const modelConfig = agent.modelConfig;
    const model = modelConfig?.modelName ?? 'openai/gpt-4o';

    const ragStart = Date.now();
    const ragChunks = await this.fetchRagChunks(userMessage, conversation.companyId);
    const ragDuration = Date.now() - ragStart;
    this.logger.log(`[Runner] RAG concluído | ${ragChunks.length} chunk(s) recuperado(s)`);

    await this.tracker.addStep(runId, {
      stepType: 'RAG_SEARCH',
      toolName: 'rag_search',
      input: { query: userMessage },
      output: {
        chunks: ragChunks.map((chunk) => ({ content: chunk.content.slice(0, 200), score: chunk.score })),
        total: ragChunks.length,
      },
      durationMs: ragDuration,
      iteration: 0,
    });

    const messages: LlmMessage[] = this.promptBuilder.build(
      agent,
      history,
      ragChunks,
      userMessage,
      sender,
    );
    this.logger.log(`[Runner] Prompt montado | ${messages.length} mensagem(s) para o LLM`);

    const mcpSessions = await this.mcpToolLoader.openSessionsForAgent(agent.id);
    const mcpTools = mcpSessions.flatMap((session) => session.tools);
    if (mcpTools.length > 0) {
      this.logger.log(`[Runner] MCP: ${mcpTools.length} tool(s) carregada(s) de ${mcpSessions.length} servidor(es)`);
    }

    const mcpToolNames = new Set(mcpTools.map((tool) => tool.name));
    let builtinTools = this.toolRegistry.toOpenAiTools();
    if (!agent.journeyConfig?.enabled) {
      builtinTools = builtinTools.filter((tool) => tool.function.name !== 'request_human_help');
    }
    const tools = [
      ...builtinTools,
      ...mcpTools.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      })),
    ];
    const toolContext = {
      companyId: conversation.companyId,
      agentId: agent.id,
      senderPhone: conversation.userPhone,
      conversationId: conversation.id,
    };

    const ask = () =>
      this.llm.complete({
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: modelConfig?.temperature,
        maxTokens: modelConfig?.maxTokens,
        topP: modelConfig?.topP,
        frequencyPenalty: modelConfig?.frequencyPenalty,
        presencePenalty: modelConfig?.presencePenalty,
      });

    this.logger.log(`[Runner] Iniciando chamada ao LLM (iteração 1)`);
    const llmStart = Date.now();
    let response: LlmCompletionResponse = await ask();
    await this.tracker.addStep(runId, {
      stepType: 'LLM_CALL',
      toolName: model,
      input: { messageCount: messages.length, toolCount: tools.length },
      output: {
        finishReason: response.finishReason,
        toolCallCount: response.toolCalls.length,
        contentLength: (response.content ?? '').length,
      },
      durationMs: Date.now() - llmStart,
      iteration: 0,
    });

    try {
      while (
        response.finishReason === 'tool_calls' &&
        response.toolCalls.length > 0 &&
        progress.iterations < this.maxToolIterations
      ) {
        this.logger.log(
          `[Runner] Tool calls (iter ${progress.iterations + 1}): ${response.toolCalls.map((call) => call.function.name).join(', ')}`,
        );
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls,
        });

        const toolCallStart = Date.now();
        const toolResults = await this.toolExecutor.execute(response.toolCalls, toolContext, mcpTools);
        const toolCallDuration = Date.now() - toolCallStart;
        progress.totalToolCalls += toolResults.length;

        for (let index = 0; index < toolResults.length; index++) {
          const call = response.toolCalls[index];
          const result = toolResults[index];
          await this.tracker.addStep(runId, {
            stepType: mcpToolNames.has(call.function.name) ? 'MCP_TOOL_CALL' : 'TOOL_CALL',
            toolName: call.function.name,
            input: this.safeParseJson(call.function.arguments),
            output: this.safeParseJson(result.content),
            errorMessage: result.errorMessage,
            durationMs: Math.round(toolCallDuration / toolResults.length),
            iteration: progress.iterations + 1,
          });
          messages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: result.tool_call_id,
          });
        }

        this.logger.log(`[Runner] Reinvocando LLM com resultados das tools (iteração ${progress.iterations + 2})`);
        const llmIterStart = Date.now();
        response = await ask();
        await this.tracker.addStep(runId, {
          stepType: 'LLM_CALL',
          toolName: model,
          input: { messageCount: messages.length, toolCount: tools.length },
          output: {
            finishReason: response.finishReason,
            toolCallCount: response.toolCalls.length,
            contentLength: (response.content ?? '').length,
          },
          durationMs: Date.now() - llmIterStart,
          iteration: progress.iterations + 1,
        });
        progress.iterations++;
      }
    } finally {
      await this.mcpToolLoader.closeSessions(mcpSessions);
    }

    if (progress.iterations >= this.maxToolIterations) {
      this.logger.warn(
        `[Runner] Limite de ${this.maxToolIterations} iterações de tool calls atingido | conv=${conversation.id}`,
      );
    }

    progress.assistantText = response.content ?? '';
    this.logger.log(
      `[Runner] Loop LLM concluído | iterações=${progress.iterations} | finishReason=${response.finishReason} | resposta=${progress.assistantText.length} chars`,
    );
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

  async fetchRagChunks(
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
