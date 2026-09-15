export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Lista as datas YYYY-MM-DD do intervalo (inclusive). */
export function listDatesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T12:00:00.000Z`)

  while (true) {
    const iso = cursor.toISOString().slice(0, 10)
    dates.push(iso)
    if (iso >= endDate) break
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

/** Meia-noite BRT (UTC-3) → timestamp em ms. */
export function dayStartTimestampMs(dateOnly: string): number {
  return new Date(`${dateOnly}T03:00:00.000Z`).getTime()
}

/** Fim do dia BRT (UTC-3) → timestamp em ms. */
export function dayEndTimestampMs(dateOnly: string): number {
  const end = new Date(`${dateOnly}T03:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1)
  return end.getTime()
}

/** Converte um valor de data qualquer em ISO string, com fallback para agora. */
export function toIsoString(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString()
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString()
  }
  return date.toISOString()
}

export function digitsOnly(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined
  const digits = value.replace(/\D/g, '')
  return digits.length > 0 ? digits : undefined
}
