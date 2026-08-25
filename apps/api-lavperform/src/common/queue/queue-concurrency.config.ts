function readConcurrency(envKey: string, fallback: number): number {
  const parsed = Number(process.env[envKey]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/** Validação WhatsApp — default 5; override via QUEUE_CONCURRENCY_WHATSAPP_VALIDATION. */
export const WHATSAPP_VALIDATION_CONCURRENCY = readConcurrency(
  'QUEUE_CONCURRENCY_WHATSAPP_VALIDATION',
  5,
);
