export function cleanNumber(value?: string | null): string {
  if (!value) return ''
  return value.replace(/\D/g, '')
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
