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

/** Variantes usadas no lookup para não recriar o mesmo telefone em formatos diferentes. */
export function phoneLookupVariants(phone?: string | null): string[] {
  const raw = emptyToNull(phone);
  if (!raw) return [];
  if (raw.startsWith('cpf:')) return [raw];

  const variants = new Set<string>([raw]);
  const formatted = safeFormatPhoneNumber(raw);
  if (formatted) variants.add(formatted);

  const digits = (formatted ?? raw).replace(/\D/g, '');
  if (digits) variants.add(digits);

  const withoutCountry =
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (withoutCountry) variants.add(withoutCountry);

  if (withoutCountry.length === 11 && withoutCountry[2] === '9') {
    const withoutNine = withoutCountry.slice(0, 2) + withoutCountry.slice(3);
    variants.add(withoutNine);
    variants.add(`55${withoutNine}`);
  }

  if (withoutCountry.length === 10) {
    const withNine = withoutCountry.slice(0, 2) + '9' + withoutCountry.slice(2);
    variants.add(withNine);
    variants.add(`55${withNine}`);
  }

  return [...variants].filter(Boolean);
}

export function canonicalPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}
