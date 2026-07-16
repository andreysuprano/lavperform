export const EMPTY_PLACEHOLDER = '-'

/**
 * Retorna o valor pronto para exibição ou um placeholder quando o dado está
 * ausente (null, undefined, string vazia, número inválido). Evita que a tela
 * quebre quando o backend não envia um campo.
 * @param value Valor a ser exibido
 * @param placeholder Texto usado quando o valor está vazio (padrão "-")
 */
export function displayValue(
  value: unknown,
  placeholder: string = EMPTY_PLACEHOLDER
): string {
  if (value === null || value === undefined) {
    return placeholder
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : placeholder
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : placeholder
  }

  if (typeof value === 'boolean') {
    return String(value)
  }

  return placeholder
}

/**
 * Aplica um formatador a um valor de forma segura: se o valor estiver ausente
 * ou se o formatador falhar/retornar vazio, devolve o placeholder.
 * @param value Valor bruto (ex.: telefone, data)
 * @param formatter Função de formatação
 * @param placeholder Texto usado quando o valor está vazio (padrão "-")
 */
export function formatOrPlaceholder<T>(
  value: T | null | undefined,
  formatter: (value: T) => string,
  placeholder: string = EMPTY_PLACEHOLDER
): string {
  if (value === null || value === undefined || value === '') {
    return placeholder
  }

  try {
    const formatted = formatter(value)
    return formatted && formatted.trim().length > 0 ? formatted : placeholder
  } catch {
    return placeholder
  }
}

export function normalizeText(text?: string | null, maxLength: number = 15) {
  if (!text) {
    return '-'
  }

  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...'
  }

  return text
}

export function formatDate(dateString: string): string {
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function clearPhone(string: string) {
  const clearedPhone = string.replace(/\D/g, '')

  if (clearedPhone.startsWith('55')) {
    return clearedPhone
  } else {
    return '55' + clearedPhone
  }
}

/**
 * Obtém as iniciais de um nome
 * @param name Nome completo
 * @returns Iniciais do nome (primeira letra do primeiro e último nome)
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Formata a data de "Cliente desde" no formato curto
 * @param dateString Data em formato ISO
 * @returns Data formatada (ex: "Jan 2023") ou " " se inválida
 */
export function formatClientSince(dateString?: string): string {
  if (!dateString) return ' '
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ' '

    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return `${month}/${year}`
  } catch {
    return ' '
  }
}
