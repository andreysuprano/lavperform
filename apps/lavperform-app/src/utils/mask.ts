export function cleanNumber(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

/**
 * Normaliza telefone BR para WhatsApp (dígitos com DDI 55).
 * - Aceita com ou sem 55, com máscara, etc.
 * - Prefixa 55 quando faltar e o número tiver 10–11 dígitos (DDD + local).
 * - Retorna null se vazio ou inválido.
 */
export function normalizeBrazilianWhatsAppPhone(
  value?: string | null
): string | null {
  const digits = cleanNumber(value)
  if (!digits) return null

  let normalized = digits
  if (!normalized.startsWith('55') && (normalized.length === 10 || normalized.length === 11)) {
    normalized = `55${normalized}`
  }

  // 55 + DDD(2) + 8 (fixo) = 12 | 55 + DDD(2) + 9 + 8 (celular) = 13
  if (
    normalized.startsWith('55') &&
    (normalized.length === 12 || normalized.length === 13)
  ) {
    return normalized
  }

  return null
}

/** Extrai o DDD brasileiro (2 dígitos) a partir do telefone com ou sem código 55. */
export function extractBrazilianDdd(phone?: string | null): string | null {
  if (!phone) return null
  const d = cleanNumber(phone)
  if (d.startsWith('55') && d.length >= 12) {
    return d.slice(2, 4)
  }
  if (d.length >= 10) {
    return d.slice(0, 2)
  }
  return null
}

export function formatCpf(value: string): string {
  const cnpjCpf = cleanNumber(value)
  return cnpjCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4')
}

export function formatTelefone(value?: string | null): string {
  if (!value) return ''
  const telefone = cleanNumber(value)
  const tamanho = telefone.length
  if (tamanho === 11) {
    return telefone.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/g, '($1) $2$3-$4')
  }
  if (tamanho === 10) {
    return telefone.replace(/(\d{2})(\d{4})(\d{4})/g, '($1) 9$2-$3')
  }
  return formatTelefoneDDI(telefone)
}

function formatTelefoneDDI(value: string): string {
  const telefone = cleanNumber(value)
  return telefone.replace(
    /(\d{2})(\d{2})(\d{1})(\d{4})(\d{4})/g,
    '+$1 ($2) $3$4-$5'
  )
}

export function formatCnpj(value: string): string {
  const cnpj = cleanNumber(value)
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5')
}

export function formatCep(value: string): string {
  const cep = cleanNumber(value)
  return cep.replace(/(\d{5})(\d{3})/g, '$1-$2')
}
