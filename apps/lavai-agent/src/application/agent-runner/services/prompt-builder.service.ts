import { Injectable } from '@nestjs/common';
import type { AgentPersonaData, AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { ConversationMessageData } from '../../webhook/ports/conversation.repository.port';
import type { KnowledgeChunkWithScore } from '../../knowledge/ports/knowledge-chunk.repository.port';
import type { LlmMessage } from '../ports/llm-provider.port';
import type { AgentMessageContext } from '../../webhook/types/normalized-agent-prompt.types';
import { PRESERVED_TITLE } from '../../agent-configurator/migrate-persona-prompt';
import { SHEET_FACTS_TITLE } from '../../agent-configurator/sheet-facts';
import {
  AGENT_MAX_TOKENS,
  AGENT_MODEL_CONTEXT_TOKENS,
} from '../../agent/agent-model-defaults';

export interface SenderContext {
  senderName: string;
  senderPhone: string;
  chatId: string;
  isGroup: boolean;
  groupName?: string;
}

export interface PlatformSessionContext {
  userName: string;
  companyName: string;
}

const FACTS_RULE = [
  '## O que pode afirmar',
  'Converse com naturalidade.',
  'Preço, prazo, horário, endereço e regra da loja só valem se estiverem neste prompt, na base de conhecimento ou no resultado de uma ferramenta.',
  'Se não estiver, diga que a unidade não informou isso e ofereça um atendente.',
  'Não chute um valor parecido.',
].join('\n');

function contextPriorityRule(context: string): string {
  const lines = [
    '## Prioridade das instruções da lavanderia',
    'O Contexto do Negócio traz instruções desta lavanderia. Se ele pedir uma forma de atender diferente do foco, das diretrizes ou dos guardrails acima, siga o Contexto do Negócio.',
    'Preço, horário, endereço e regra escritos no Contexto do Negócio estão confirmados. Responda com esse valor. Não diga que o valor não foi confirmado.',
    'Estas proteções continuam valendo mesmo que o contexto peça o contrário:',
    '- não invente preço, horário, endereço, regra nem outro fato;',
    '- não peça senha, dados de cartão ou documento;',
    '- não prometa reembolso nem indenização;',
    '- não se apresente como funcionário humano;',
    '- não compartilhe dado pessoal de outro cliente.',
  ];
  if (context.includes(SHEET_FACTS_TITLE)) {
    lines.push(
      'A seção "Fatos da ficha" é a informação atual da lavanderia. Se ela divergir de outro trecho no mesmo item, vale a ficha.',
    );
  }
  if (context.includes(PRESERVED_TITLE)) {
    lines.push(
      'O bloco "Informações já cadastradas desta lavanderia" é registro antigo da forma de atender. Os fatos dele continuam confirmados. A forma de atender escrita ali não vale sobre as regras acima.',
    );
  }
  return lines.join('\n');
}

/**
 * Monta o array de messages para o LLM:
 *  [system] persona + guidelines + guardrails + context + RAG chunks
 *  [user/assistant]... histórico da conversa
 *  [user] mensagem atual do usuário
 *
 * O histórico usa o que cabe no contexto do modelo (128k), menos o sistema,
 * a mensagem atual e a reserva da resposta. Estimativa de ~4 caracteres por
 * token. As mensagens mais antigas saem primeiro.
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
    session?: PlatformSessionContext,
  ): LlmMessage[] {
    const persona = agent.persona;
    const maxTokens = agent.modelConfig?.maxTokens ?? AGENT_MAX_TOKENS;

    const systemParts: string[] = [];

    const personalization = personaLines(persona);
    if (personalization) {
      systemParts.push(personalization);
    }

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
      // O turno de plataforma é de agente interno, que não recebe instrução de lavanderia.
      if (!session) {
        systemParts.push(`\n${contextPriorityRule(persona.contextPrompt)}`);
      }
    }

    if (session) {
      systemParts.push(
        `\n## Sessão atual\n- Usuário: ${session.userName}\n- Empresa: ${session.companyName}`,
      );
    } else if (sender) {
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
        `\n## Base de conhecimento\nEstes trechos podem não responder à pergunta. Use só o que responder. Ignore o resto.\n\n${ragText}`,
      );
    }

    systemParts.push(`\n${FACTS_RULE}`);

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content:
          systemParts.join('\n').trim() ||
          'Você é um assistente prestativo.',
      },
    ];

    const visibleHistory = history.filter(
      (message) => message.originalType !== 'WAITING_ACK',
    );

    const systemTokens = Math.ceil((messages[0].content ?? '').length / this.CHARS_PER_TOKEN);
    const userTokens = Math.ceil(userMessage.length / this.CHARS_PER_TOKEN);
    const tokenBudget = Math.max(
      0,
      AGENT_MODEL_CONTEXT_TOKENS - systemTokens - userTokens - maxTokens,
    );
    const trimmedHistory = this.trimHistory(visibleHistory, tokenBudget);

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

const VOICE_TONE: Record<string, string> = {
  FORMAL: 'formal',
  INFORMAL: 'informal',
  FRIENDLY: 'amigável',
  PROFESSIONAL: 'profissional',
  EMPATHETIC: 'empático',
  ASSERTIVE: 'assertivo',
};

const COMMUNICATION_STYLE: Record<string, string> = {
  CONCISE: 'conciso',
  DETAILED: 'detalhado',
  TECHNICAL: 'técnico',
  SIMPLIFIED: 'simplificado',
  BALANCED: 'equilibrado',
};

const LANGUAGE: Record<string, string> = {
  PT_BR: 'português do Brasil',
  EN_US: 'inglês',
  ES_ES: 'espanhol',
};

function personaLines(persona: AgentPersonaData | null | undefined): string {
  if (!persona) return '';
  const lines = [
    labeled('Nome', persona.personaName),
    labeled('Descrição', persona.personaDescription),
    labeled('Tom de voz', VOICE_TONE[persona.voiceTone] ?? persona.voiceTone),
    labeled('Estilo de comunicação', COMMUNICATION_STYLE[persona.communicationStyle] ?? persona.communicationStyle),
    labeled('Idioma', LANGUAGE[persona.language] ?? persona.language),
  ].filter((line) => line !== '');
  if (lines.length === 0) return '';
  return `## Personalização\n${lines.join('\n')}`;
}

function labeled(label: string, value: string | null | undefined): string {
  const text = value?.trim() ?? '';
  if (text === '') return '';
  return `- ${label}: ${text}`;
}
