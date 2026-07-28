import { Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage } from '../types/incoming-message.types';
import { MessageType } from '../types/incoming-message.types';
import type {
  AudioIncomingMessage,
  ImageIncomingMessage,
  TextIncomingMessage,
  VideoIncomingMessage,
} from '../types/incoming-message.types';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import { HumanTakeoverService } from './human-takeover.service';

export interface FilterResult {
  allowed: boolean;
  /** Motivo da rejeição (presente apenas quando allowed = false) */
  reason?: string;
  /**
   * Texto após remoção do gatilho (quando triggerRemoveFromText = true).
   * Somente relevante quando allowed = true e gatilho estava habilitado.
   */
  cleanedText?: string;
}

/**
 * Avalia os filtros de acesso e gatilho configurados no agente.
 *
 * Ordem de avaliação:
 *  1. isFromMe + wasSentByApi → mensagens do próprio dispositivo do atendente
 *     ativam o período de espera de 10 min; mensagens da API são descartadas silenciosamente.
 *  2. humanTakeover → bloqueia respostas do bot enquanto atendente está em controle.
 *  3. allowedPhones → rejeita remetentes não autorizados
 *  4. allowedGroups → rejeita grupos não autorizados
 *  5. triggerWords → verifica gatilho textual no triggerText fornecido
 */
@Injectable()
export class MessageFilterService {
  private readonly logger = new Logger(MessageFilterService.name);

  constructor(private readonly humanTakeover: HumanTakeoverService) {}

  /**
   * Verifica os filtros de acesso (sem necessidade de texto normalizado).
   * Deve ser chamado ANTES da normalização para evitar chamadas desnecessárias à API.
   */
  async checkAccess(message: IncomingMessage, agent: AgentWithConfigsData): Promise<FilterResult> {
    // Mensagens enviadas pela própria instância (bot ou atendente)
    if (message.isFromMe) {
      if (!message.wasSentByApi) {
        // Atendente digitou manualmente no dispositivo → ativa período de espera
        await this.humanTakeover.setTakeover(agent.id, message.chatId);
        this.logger.log(
          `[Filter] Intervenção humana detectada — agente em espera | agentId=${agent.id} | chatId=${message.chatId}`,
        );
      } else {
        this.logger.log(
          `[Filter] Descartado (mensagem enviada pela API) | sender=${message.senderPhone} | chatId=${message.chatId}`,
        );
      }
      return { allowed: false, reason: 'Mensagem da própria instância ignorada' };
    }

    // Verifica se o atendente está em controle desta conversa
    const inTakeover = await this.humanTakeover.isInTakeover(agent.id, message.chatId);
    if (inTakeover) {
      this.logger.log(
        `[Filter] Descartado (atendente em controle) | agentId=${agent.id} | chatId=${message.chatId}`,
      );
      return { allowed: false, reason: 'Atendente humano em controle da conversa' };
    }

    const filter = agent.filterConfig;
    if (!filter) {
      this.logger.debug(`[Filter] Sem filterConfig para agente ${agent.id} — acesso liberado`);
      return { allowed: true };
    }

    // Filtro de telefones
    if (filter.allowedPhones.length > 0) {
      const normalized = this.normalizePhone(message.senderPhone);
      const allowed = filter.allowedPhones.some(
        (p) => this.normalizePhone(p) === normalized,
      );
      if (!allowed) {
        this.logger.warn(
          `[Filter] Acesso negado por telefone | sender=${message.senderPhone} | agente=${agent.id}`,
        );
        return {
          allowed: false,
          reason: `Telefone ${message.senderPhone} não está na lista de permitidos`,
        };
      }
    }

    // Filtro de grupos
    if (message.isGroup && filter.allowedGroups.length > 0) {
      const allowed = filter.allowedGroups.includes(message.chatId);
      if (!allowed) {
        this.logger.warn(
          `[Filter] Acesso negado por grupo | chatId=${message.chatId} | agente=${agent.id}`,
        );
        return {
          allowed: false,
          reason: `Grupo ${message.chatId} não está na lista de permitidos`,
        };
      }
    }

    this.logger.debug(
      `[Filter] Acesso liberado | sender=${message.senderPhone} | chatId=${message.chatId} | agente=${agent.id}`,
    );
    return { allowed: true };
  }

  /**
   * Verifica o gatilho textual.
   * Deve ser chamado com o texto já extraído (caption para imagem/vídeo,
   * transcrição para áudio, texto para texto).
   *
   * @param triggerText Texto a verificar (caption, transcrição ou texto livre)
   * @param agent Agente com filterConfig
   * @returns FilterResult com cleanedText quando triggerRemoveFromText = true
   */
  checkTrigger(triggerText: string, agent: AgentWithConfigsData): FilterResult {
    const filter = agent.filterConfig;

    if (!filter || !filter.triggerEnabled || filter.triggerWords.length === 0) {
      this.logger.debug(`[Filter] Gatilho desabilitado ou sem palavras | agente=${agent.id}`);
      return { allowed: true, cleanedText: triggerText };
    }

    const haystack = filter.triggerCaseSensitive
      ? triggerText
      : triggerText.toLowerCase();

    const matchedWord = filter.triggerWords.find((word) => {
      const needle = filter.triggerCaseSensitive ? word : word.toLowerCase();
      return haystack.includes(needle);
    });

    if (!matchedWord) {
      this.logger.warn(
        `[Filter] Trigger não acionado | agente=${agent.id} | texto="${triggerText.slice(0, 80)}" | words=[${filter.triggerWords.join(', ')}]`,
      );
      return {
        allowed: false,
        reason: `Nenhuma trigger word encontrada no texto: "${triggerText.slice(0, 80)}"`,
      };
    }

    this.logger.log(`[Filter] Trigger acionado: "${matchedWord}" | agente=${agent.id}`);

    let cleanedText = triggerText;
    if (filter.triggerRemoveFromText) {
      const flags = filter.triggerCaseSensitive ? 'g' : 'gi';
      const escaped = matchedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanedText = triggerText.replace(new RegExp(escaped, flags), '').trim();
    }

    return { allowed: true, cleanedText };
  }

  /**
   * Extrai o texto de gatilho de uma mensagem SEM fazer chamadas a APIs externas.
   * Para áudio retorna null (necessita transcrição Whisper).
   */
  extractQuickTriggerText(message: IncomingMessage): string | null {
    switch (message.type) {
      case MessageType.TEXT:
        return (message as TextIncomingMessage).text;
      case MessageType.IMAGE:
        return (message as ImageIncomingMessage).caption ?? '';
      case MessageType.VIDEO:
        return (message as VideoIncomingMessage).caption ?? '';
      case MessageType.AUDIO:
        return null; // Requer transcrição
      default:
        return '';
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
