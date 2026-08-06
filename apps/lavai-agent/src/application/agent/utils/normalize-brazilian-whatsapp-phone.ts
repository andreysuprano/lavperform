/**
 * Normaliza telefone BR para WhatsApp (dígitos com DDI 55).
 * Prefixa 55 quando o número local tem 10–11 dígitos.
 * Retorna null se vazio ou inválido.
 */
export function normalizeBrazilianWhatsAppPhone(
  value?: string | null,
): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (
    !normalized.startsWith('55') &&
    (normalized.length === 10 || normalized.length === 11)
  ) {
    normalized = `55${normalized}`;
  }

  if (
    normalized.startsWith('55') &&
    (normalized.length === 12 || normalized.length === 13)
  ) {
    return normalized;
  }

  return null;
}
