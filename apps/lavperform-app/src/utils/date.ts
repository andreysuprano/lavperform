/**
 * Formata uma data para exibição de eventos
 * Formato: DD MMM, HH:MM (ex: 15 dez, 14:30)
 */
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Verifica se um evento está ao vivo (live)
 * Considera um evento live se estiver entre a data de início e 2 horas depois
 */
export function isEventLive(
  eventDate: string,
  durationHours: number = 2
): boolean {
  const now = new Date()
  const eventStart = new Date(eventDate)
  const eventEnd = new Date(
    eventStart.getTime() + durationHours * 60 * 60 * 1000
  )

  return now >= eventStart && now <= eventEnd
}

/**
 * Formata uma data completa para exibição
 * Formato: DD/MM/YYYY
 */
export function formatFullDate(dateString: string): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formata uma data com hora
 * Formato: DD/MM/YYYY HH:MM
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimeOfDay(dateString: string): string {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const CAMPAIGN_CALENDAR_TIMEZONE = 'America/Sao_Paulo'

/**
 * Converte uma string de data (ISO 8601 ou qualquer formato válido) para o
 * valor aceito pelo input[type="date"] do HTML: "YYYY-MM-DD".
 *
 * Regras (alinhadas ao backend):
 * - Meia-noite UTC exata (legado `T00:00:00.000Z`): usa a data UTC (date-only).
 * - Demais instantes: usa o dia civil em America/Sao_Paulo (início/fim do dia SP).
 */
export function toHtmlDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr || !String(dateStr).trim()) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''

  const isUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0

  if (isUtcMidnight) {
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // en-CA → YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: CAMPAIGN_CALENDAR_TIMEZONE })
}

/**
 * Formata a data civil da campanha para exibição pt-BR (DD/MM/YYYY).
 * Usa as mesmas regras de `toHtmlDateInputValue` (legado UTC midnight vs dia SP).
 */
export function formatCampaignCalendarDateBr(
  dateStr: string | null | undefined,
): string {
  const ymd = toHtmlDateInputValue(dateStr)
  if (!ymd) return ''
  const [year, month, day] = ymd.split('-')
  return `${day}/${month}/${year}`
}
