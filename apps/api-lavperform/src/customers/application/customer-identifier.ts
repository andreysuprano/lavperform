import { safeFormatPhoneNumber } from '../../common/utils/formatters';

export function emptyToNull(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function normalizeCpfDigits(cpf?: string | null): string | null {
  const raw = emptyToNull(cpf);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export function normalizeStoredPhone(phone?: string | null): string | null {
  const raw = emptyToNull(phone);
  if (!raw) return null;
  return safeFormatPhoneNumber(raw) ?? raw;
}

export function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}
