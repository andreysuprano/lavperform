/**
 * Utilitários puros de data para o DateRangeFilter.
 * Sem dependências externas; tudo opera em horário local do usuário.
 * O formato de transporte para a API é sempre YYYY-MM-DD.
 */

export type YMD = string

export const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export const WEEKDAYS_PT_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export const MAX_RANGE_DAYS = 90

export function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function toYMD(d: Date): YMD {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromYMD(s: string | undefined | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  d.setHours(0, 0, 0, 0)
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null
  }
  return d
}

export function fromBR(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim())
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  d.setHours(0, 0, 0, 0)
  if (
    d.getDate() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getFullYear() !== Number(m[3])
  ) {
    return null
  }
  return d
}

export function toBR(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function diffInDays(a: Date, b: Date): number {
  const msPerDay = 86_400_000
  return Math.round((b.getTime() - a.getTime()) / msPerDay)
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setMonth(x.getMonth() + n)
  return x
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime()
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime()
}

/** Matriz 6x7 de datas que compõem a "vista de mês" iniciando no domingo. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month, 1 - startDay + i)
    d.setHours(0, 0, 0, 0)
    days.push(d)
  }
  return days
}

/**
 * Rótulo curto para exibir um intervalo customizado selecionado.
 * - Intervalo no mesmo ano corrente: "01/05 – 15/05"
 * - Cruzando anos ou outro ano: "15/12/2025 – 10/01/2026"
 */
export function formatRangeLabel(start: Date, end: Date): string {
  const currentYear = today().getFullYear()
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameAsCurrent = start.getFullYear() === currentYear
  if (sameYear && sameAsCurrent) {
    const opt: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
    }
    return `${start.toLocaleDateString('pt-BR', opt)} – ${end.toLocaleDateString(
      'pt-BR',
      opt
    )}`
  }
  return `${toBR(start)} – ${toBR(end)}`
}

/** Aplica a máscara DD/MM/AAAA conforme o usuário digita. */
export function maskBRDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts: string[] = []
  if (digits.length > 0) parts.push(digits.slice(0, 2))
  if (digits.length > 2) parts.push(digits.slice(2, 4))
  if (digits.length > 4) parts.push(digits.slice(4, 8))
  return parts.join('/')
}
