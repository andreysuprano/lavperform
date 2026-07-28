import { MessageType } from './incoming-message.types';

/**
 * Contexto de origem da mensagem — metadados do remetente e da conversa.
 * Independente do tipo de mensagem original (texto, áudio, imagem, vídeo).
 */
export interface AgentMessageContext {
  /** ID do evento de webhook que originou esta mensagem */
  webhookEventId: string;
  /** UUID da empresa (tenant) */
  companyId: string;
  /** UUID do agente que vai processar a mensagem */
  agentId: string;
  /** Número do remetente no formato E.164 */
  senderPhone: string;
  /** Nome de exibição do remetente */
  senderName: string;
  /** ID do chat no WhatsApp */
  chatId: string;
  /** Nome da instância WhatsApp no provider */
  instanceName: string;
  /** Timestamp Unix em milissegundos */
  timestamp: number;
  /** Mensagem veio de grupo? */
  isGroup: boolean;
  /** Nome do grupo (quando isGroup = true) */
  groupName?: string;
}

/**
 * Estrutura normalizada entregue ao agente de IA.
 *
 * Independente do canal ou tipo de mídia original, o agente sempre recebe
 * esta mesma estrutura. O `userMessage` já contém o conteúdo processado:
 *  - Texto → passado diretamente
 *  - Áudio → transcrição via Whisper
 *  - Imagem → descrição via GPT-4o Vision
 *  - Vídeo  → análise do thumbnail via GPT-4o Vision
 */
export interface NormalizedAgentPrompt {
  /** Mensagem final que o agente vai receber como user message */
  userMessage: string;
  /**
   * Texto usado para validação do gatilho (trigger words).
   *
   * - TEXT  → o próprio texto da mensagem
   * - AUDIO → transcrição do áudio (Whisper)
   * - IMAGE → legenda enviada junto da imagem (caption)
   * - VIDEO → legenda enviada junto do vídeo (caption)
   */
  triggerText: string;
  /** Tipo original da mensagem antes da normalização */
  originalMessageType: MessageType;
  /** Metadados de contexto da conversa */
  context: AgentMessageContext;
}
