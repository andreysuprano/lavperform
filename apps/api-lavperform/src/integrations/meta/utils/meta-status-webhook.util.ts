export type MetaDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MetaStatusError {
  code: number;
  title?: string;
  message?: string;
  details?: string;
}

export interface ParsedMetaStatus {
  phoneNumberId: string;
  metaMessageId: string;
  status: MetaDeliveryStatus;
  errors: MetaStatusError[];
  timestamp?: Date;
}

const KNOWN_STATUSES = new Set<MetaDeliveryStatus>([
  'sent',
  'delivered',
  'read',
  'failed',
]);

export function parseMetaStatuses(body: unknown): ParsedMetaStatus[] {
  const root = body as { entry?: unknown };
  const entries = Array.isArray(root?.entry) ? root.entry : [];
  const parsed: ParsedMetaStatus[] = [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value;
      const phoneNumberId = (
        value?.metadata as { phone_number_id?: string } | undefined
      )?.phone_number_id;
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
      if (!phoneNumberId) continue;

      for (const raw of statuses) {
        const row = raw as Record<string, unknown>;
        const status = (
          typeof row.status === 'string' ? row.status.toLowerCase() : ''
        ) as MetaDeliveryStatus;
        if (typeof row.id !== 'string' || !KNOWN_STATUSES.has(status)) continue;
        parsed.push({
          phoneNumberId,
          metaMessageId: row.id,
          status,
          errors: parseErrors(row.errors),
          ...parseTimestamp(row.timestamp),
        });
      }
    }
  }

  return parsed;
}

function parseErrors(raw: unknown): MetaStatusError[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.code === 'number')
    .map((item) => ({
      code: item.code as number,
      title: typeof item.title === 'string' ? item.title : undefined,
      message: typeof item.message === 'string' ? item.message : undefined,
      details: (item.error_data as { details?: string } | undefined)?.details,
    }));
}

function parseTimestamp(raw: unknown): { timestamp?: Date } {
  const seconds = Number(raw);
  if (!raw || !Number.isFinite(seconds) || seconds <= 0) return {};
  return { timestamp: new Date(seconds * 1000) };
}
