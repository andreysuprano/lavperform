import { Prisma } from '@prisma/client';

const DEFAULT_TTL_DAYS = 30;

const DEFINITIVE_INVALIDATION_PATTERNS = [
  /not on whatsapp/i,
  /no lid found/i,
] as const;

export function getWhatsappVerificationTtlDays(): number {
  const raw = process.env.WHATSAPP_VERIFICATION_TTL_DAYS;
  if (!raw) {
    return DEFAULT_TTL_DAYS;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_DAYS;
}

export function getWhatsappVerificationCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - getWhatsappVerificationTtlDays());
  return cutoff;
}

export function isWhatsappVerificationFresh(
  verifiedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!verifiedAt) {
    return false;
  }

  return verifiedAt.getTime() >= getWhatsappVerificationCutoff(now).getTime();
}

export function buildFreshWhatsappCustomerFilter(
  now: Date = new Date(),
): Prisma.CustomerWhereInput {
  return {
    whatsappOptin: true,
    whatsappVerified: true,
    whatsappVerifiedAt: {
      gte: getWhatsappVerificationCutoff(now),
    },
  };
}

export function buildStaleWhatsappCustomerFilter(
  now: Date = new Date(),
): Prisma.CustomerWhereInput {
  return {
    whatsappVerified: true,
    phone: { not: null },
    NOT: {
      phone: {
        startsWith: 'cpf:',
      },
    },
    OR: [
      { whatsappVerifiedAt: null },
      { whatsappVerifiedAt: { lt: getWhatsappVerificationCutoff(now) } },
    ],
  };
}

export function shouldInvalidateWhatsappOnSendError(errorMessage: string): boolean {
  const normalized = errorMessage.trim();
  if (!normalized) {
    return false;
  }

  return DEFINITIVE_INVALIDATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildWhatsappValidationJobId(customerId: string, phone: string): string {
  return `validate-${customerId}-${phone}`;
}
