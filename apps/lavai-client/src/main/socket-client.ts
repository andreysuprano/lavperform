import { io, Socket } from 'socket.io-client';
import { alertQueue } from './alert-queue';
import { Logger } from './logger';
import { getSettings, normalizeApiUrl } from './settings-store';
import { handleNewAlert } from './window-manager';
import { HelpAlert } from '../shared/types';

const logger = new Logger('SocketClient');

let socket: Socket | null = null;
let connectionListeners: Array<(connected: boolean) => void> = [];

export function onConnectionChange(cb: (connected: boolean) => void): () => void {
  connectionListeners.push(cb);
  cb(socket?.connected ?? false);
  return () => {
    connectionListeners = connectionListeners.filter((l) => l !== cb);
  };
}

function notifyConnection(connected: boolean): void {
  for (const cb of connectionListeners) cb(connected);
}

async function fetchPending(apiUrl: string, agentId: string): Promise<HelpAlert[]> {
  try {
    const res = await fetch(`${apiUrl}/agents/${agentId}/help-requests?status=PENDING`);
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      id: string;
      agentId: string;
      companyId: string;
      conversationId: string;
      userName: string;
      userPhone: string;
      chatId: string;
      lastMessage: string | null;
      requestedAt: string;
    }>;
    return data.map((r) => ({
      helpRequestId: r.id,
      agentId: r.agentId,
      companyId: r.companyId,
      conversationId: r.conversationId,
      userName: r.userName,
      userPhone: r.userPhone,
      chatId: r.chatId,
      lastMessage: r.lastMessage,
      requestedAt: r.requestedAt,
    }));
  } catch (err) {
    logger.error('Falha ao buscar pendentes', err);
    return [];
  }
}

async function validateApiUrl(apiUrl: string, agentId: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/agents/${agentId}/help-requests?status=PENDING`);
    if (res.status === 404) {
      return (
        'Esta URL não é a API do backend (404). ' +
        'Use a URL do lavai-agent — ex.: http://localhost:3000'
      );
    }
    if (!res.ok) {
      return `API respondeu com erro HTTP ${res.status} em ${apiUrl}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `Não foi possível acessar a API em ${apiUrl}: ${message}`;
  }
  return null;
}

export function connectSocket(): void {
  disconnectSocket();

  const settings = getSettings();
  const apiUrl = normalizeApiUrl(settings.apiUrl);
  const missing: string[] = [];
  if (!apiUrl) missing.push('URL da API');
  if (!settings.agentId?.trim()) missing.push('ID do Agente');

  if (missing.length > 0) {
    logger.warn(
      `${missing.join(' e ')} não configurado(s) — abra Configurações no menu do tray`,
    );
    notifyConnection(false);
    return;
  }

  const socketUrl = `${apiUrl}/attendant`;
  logger.log(`Conectando em ${socketUrl}`);

  void validateApiUrl(apiUrl, settings.agentId).then((validationError) => {
    if (validationError) {
      logger.warn(validationError);
    }
  });

  socket = io(socketUrl, {
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
    auth: settings.apiKey ? { apiKey: settings.apiKey } : undefined,
  });

  socket.on('connect', () => {
    logger.log('Conectado ao servidor');
    socket?.emit('subscribe', { agentId: settings.agentId });
    notifyConnection(true);
    void fetchPending(apiUrl, settings.agentId).then((pending) => {
      alertQueue.setAll(pending);
    });
  });

  socket.on('disconnect', (reason) => {
    logger.warn(`Desconectado (${reason})`);
    notifyConnection(false);
  });

  socket.on('connect_error', (err) => {
    const hint =
      err.message.includes('xhr poll error') || err.message.includes('websocket error')
        ? ' — confira se a URL é do food-agent (API), não do dashboard'
        : '';
    logger.error(`Erro de conexão em ${socketUrl}: ${err.message}${hint}`);
    notifyConnection(false);
  });

  socket.on('help:requested', (payload: HelpAlert) => {
    const added = alertQueue.push(payload);
    if (added) handleNewAlert(payload);
  });

  socket.on('help:claimed', (payload: { helpRequestId: string }) => {
    alertQueue.remove(payload.helpRequestId);
  });

  socket.on('help:resolved', (payload: { helpRequestId: string }) => {
    alertQueue.remove(payload.helpRequestId);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export async function dismissHelpRequest(
  apiUrl: string,
  helpRequestId: string,
): Promise<void> {
  await fetch(`${apiUrl}/help-requests/${helpRequestId}/dismiss`, { method: 'POST' });
  alertQueue.remove(helpRequestId);
}

export async function claimHelpRequest(apiUrl: string, helpRequestId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/help-requests/${helpRequestId}/claim`, { method: 'POST' });
  if (res.status === 409) {
    throw new Error('Já assumido por outro atendente');
  }
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  alertQueue.remove(helpRequestId);
}
