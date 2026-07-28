import { Injectable } from '@nestjs/common';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { ConversationMessageData } from '../../webhook/ports/conversation.repository.port';
import type { KnowledgeChunkWithScore } from '../../knowledge/ports/knowledge-chunk.repository.port';
import type { LlmMessage } from '../ports/llm-provider.port';
import type { AgentMessageContext } from '../../webhook/types/normalized-agent-prompt.types';

export interface SenderContext {
  senderName: string;
  senderPhone: string;
  chatId: string;
  isGroup: boolean;
  groupName?: string;
}

/**
 * Monta o array de messages para o LLM:
 *  [system] persona + guidelines + guardrails + context + RAG chunks
 *  [user/assistant]... histórico da conversa
 *  [user] mensagem atual do usuário
 *
 * Token budget: estimativa por caracteres (~4 chars por token) — sem dependência
 * externa. Se o histórico exceder o orçamento, as mensagens mais antigas são
 * descartadas primeiro.
 */
@Injectable()
export class PromptBuilderService {
  private readonly CHARS_PER_TOKEN = 4;

  build(
    agent: AgentWithConfigsData,
    history: ConversationMessageData[],
    ragChunks: KnowledgeChunkWithScore[],
    userMessage: string,
    sender?: SenderContext,
  ): LlmMessage[] {
    const persona = agent.persona;
    const maxTokens = agent.modelConfig?.maxTokens ?? 1024;

    const systemParts: string[] = [];

    if (persona?.systemPrompt) {
      systemParts.push(persona.systemPrompt);
    }

    if (persona?.behaviorGuidelines) {
      systemParts.push(
        `\n## Diretrizes de Comportamento\n${persona.behaviorGuidelines}`,
      );
    }

    if (persona?.guardrails) {
      systemParts.push(`\n## Guardrails (O que NÃO fazer)\n${persona.guardrails}`);
    }

    if (persona?.contextPrompt) {
      systemParts.push(`\n## Contexto do Negócio\n${persona.contextPrompt}`);
    }

    if (sender) {
      const lines = [
        `- Nome: ${sender.senderName}`,
        `- Telefone: ${sender.senderPhone}`,
        `- Chat ID (remoteJid): ${sender.chatId}`,
        `- É grupo: ${sender.isGroup ? 'Sim' : 'Não'}`,
      ];
      if (sender.isGroup && sender.groupName) {
        lines.push(`- Nome do grupo: ${sender.groupName}`);
      }
      systemParts.push(`\n## Dados do Usuário Atual\n${lines.join('\n')}`);
    }

    if (ragChunks.length > 0) {
      const ragText = ragChunks
        .map((c, i) => `[${i + 1}] ${c.content}`)
        .join('\n\n');
      systemParts.push(
        `\n## Base de Conhecimento (contexto relevante)\n${ragText}`,
      );
    }

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content:
          systemParts.join('\n').trim() ||
          'Você é um assistente prestativo.',
      },
    ];

    const tokenBudget = Math.floor(maxTokens * 0.75);
    const trimmedHistory = this.trimHistory(history, tokenBudget);

    for (const msg of trimmedHistory) {
      const role =
        msg.role === 'USER'
          ? 'user'
          : msg.role === 'ASSISTANT'
            ? 'assistant'
            : 'system';
      messages.push({ role, content: msg.content });
    }

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /** Remove mensagens mais antigas se o histórico exceder o orçamento de tokens. */
  private trimHistory(
    history: ConversationMessageData[],
    tokenBudget: number,
  ): ConversationMessageData[] {
    let totalChars = 0;
    const result: ConversationMessageData[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const chars = history[i].content.length;
      if (totalChars + chars > tokenBudget * this.CHARS_PER_TOKEN) break;
      totalChars += chars;
      result.unshift(history[i]);
    }

    return result;
  }
}
