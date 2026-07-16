import type { ConsumerWebhookPayload } from '../dto/consumer-webhook-payload.interface';

/**
 * ERP Consumer costuma enviar JSON com chaves PascalCase; o mapeamento espera chaves minúsculas.
 */
export function deepLowercaseObjectKeys(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepLowercaseObjectKeys(item));
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k.toLowerCase()] = deepLowercaseObjectKeys(v);
    }
    return out;
  }
  return value;
}

export function normalizeConsumerWebhookPayload(
  body: Record<string, unknown>,
): ConsumerWebhookPayload {
  return deepLowercaseObjectKeys(body) as ConsumerWebhookPayload;
}

function hasClosingTimestamp(pedido: ConsumerWebhookPayload['pedido']): boolean {
  const v = pedido?.datafechamento;
  if (v === null || v === undefined) {
    return false;
  }
  if (typeof v === 'string') {
    return v.trim().length > 0;
  }
  return String(v).trim().length > 0;
}

function isDeliveryStatusFinalized(status: unknown): boolean {
  const s = String(status ?? '')
    .trim()
    .toUpperCase();
  return s === 'F' || s === 'FINALIZADO' || s === 'CONCLUIDO';
}

/**
 * Pedido fechado no ERP (`datafechamento`). Para delivery: exige status final no bloco `delivery`
 * quando ele existe; se o bloco não vier, confia no fechamento do pedido (formato variável do webhook).
 */
export function isConsumerPayloadReadyForPersistence(
  payload: ConsumerWebhookPayload,
): boolean {
  if (!hasClosingTimestamp(payload.pedido)) {
    return false;
  }
  const tipo = (payload.tipo ?? 'delivery').toLowerCase();
  if (tipo !== 'delivery') {
    return true;
  }
  if (!payload.delivery) {
    return true;
  }
  return isDeliveryStatusFinalized(payload.delivery.status);
}
