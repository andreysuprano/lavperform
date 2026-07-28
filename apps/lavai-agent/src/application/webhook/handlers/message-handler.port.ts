import type { IncomingMessage } from '../types/incoming-message.types';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';

export const TEXT_MESSAGE_HANDLER = Symbol('TEXT_MESSAGE_HANDLER');
export const AUDIO_MESSAGE_HANDLER = Symbol('AUDIO_MESSAGE_HANDLER');
export const IMAGE_MESSAGE_HANDLER = Symbol('IMAGE_MESSAGE_HANDLER');
export const VIDEO_MESSAGE_HANDLER = Symbol('VIDEO_MESSAGE_HANDLER');

/**
 * Contrato de processamento de mensagens — agnóstico ao provider.
 * O agente já é resolvido antes de chegar ao handler (via ProcessWebhookJobUseCase).
 */
export interface MessageHandlerPort {
  handle(message: IncomingMessage, agent: AgentWithConfigsData): Promise<void>;
}
