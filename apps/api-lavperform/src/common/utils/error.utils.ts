import { HttpException } from '@nestjs/common';

type ErrorPayload = {
  message?: string | string[];
  metaCode?: number;
  metaSubcode?: number;
  fbtraceId?: string;
};

function formatMetaSuffix(payload: ErrorPayload): string {
  const parts: string[] = [];
  if (payload.metaCode != null) {
    parts.push(`code=${payload.metaCode}`);
  }
  if (payload.metaSubcode != null) {
    parts.push(`subcode=${payload.metaSubcode}`);
  }
  if (payload.fbtraceId) {
    parts.push(`fbtrace=${payload.fbtraceId}`);
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

function normalizeMessage(message: string | string[] | undefined): string | null {
  if (message == null) {
    return null;
  }
  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join('; ').trim();
    return joined || null;
  }
  const trimmed = message.trim();
  return trimmed || null;
}

function extractFromPayload(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return normalizeMessage(payload);
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as ErrorPayload;
  const message = normalizeMessage(data.message);
  if (!message) {
    return null;
  }

  return `${message}${formatMetaSuffix(data)}`;
}

/**
 * Extrai uma mensagem legível de erros NestJS/Axios/Error.
 * Para HttpException com body `{ message, metaCode, fbtraceId }`, preserva
 * a mensagem da Meta e os metadados úteis para diagnóstico.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const fromResponse = extractFromPayload(error.getResponse());
    if (fromResponse) {
      return fromResponse;
    }
    return error.message || 'Erro desconhecido';
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosLike = error as { response?: { data?: unknown }; message?: string };
    const fromAxios = extractFromPayload(axiosLike.response?.data);
    if (fromAxios) {
      return fromAxios;
    }
    if (axiosLike.message) {
      return axiosLike.message;
    }
  }

  if (error instanceof Error) {
    return error.message || 'Erro desconhecido';
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
