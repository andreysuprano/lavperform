export type CalendarCell = {
  date: string
  day: number
  inMonth: boolean
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function stamp(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

/** Semanas de domingo a sábado. Meses que começam no fim da semana e têm 31 dias ocupam 6 linhas. */
export function monthWeeks(year: number, monthIndex: number): CalendarCell[][] {
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const cursor = new Date(first)
  cursor.setUTCDate(1 - first.getUTCDay())
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  const weeks: CalendarCell[][] = []
  while (cursor.getTime() <= last.getTime()) {
    const week: CalendarCell[] = []
    for (let index = 0; index < 7; index += 1) {
      const yearOfDay = cursor.getUTCFullYear()
      const monthOfDay = cursor.getUTCMonth()
      const day = cursor.getUTCDate()
      week.push({
        date: stamp(yearOfDay, monthOfDay, day),
        day,
        inMonth: monthOfDay === monthIndex && yearOfDay === year,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function weekContaining(date: string): CalendarCell[] {
  const [year, month, day] = date.split('-').map(Number)
  const cursor = new Date(Date.UTC(year, month - 1, day))
  cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay())
  const week: CalendarCell[] = []
  for (let index = 0; index < 7; index += 1) {
    week.push({
      date: stamp(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()),
      day: cursor.getUTCDate(),
      inMonth: true,
    })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return week
}

export function addMonths(year: number, monthIndex: number, delta: number) {
  const next = new Date(Date.UTC(year, monthIndex + delta, 1))
  return { year: next.getUTCFullYear(), monthIndex: next.getUTCMonth() }
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function weekdayLabels() {
  return WEEKDAYS
}

export function monthLabel(year: number, monthIndex: number) {
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
  return `${day.replace('.', '')} · ${time}`
}

export function dateKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export function addDays(date: string, delta: number) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + delta))
  return stamp(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate())
}

/** Faixas de 3 horas do quadro de semana, no fuso de São Paulo. */
export const WEEK_SLOTS = ['09:00', '12:00', '15:00', '18:00', '21:00'] as const

export function saoPauloClock(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

export function weekSlot(iso: string) {
  const hour = Number(saoPauloClock(iso).slice(0, 2))
  if (hour < 12) return WEEK_SLOTS[0]
  if (hour < 15) return WEEK_SLOTS[1]
  if (hour < 18) return WEEK_SLOTS[2]
  if (hour < 21) return WEEK_SLOTS[3]
  return WEEK_SLOTS[4]
}

export function weekRangeLabel(week: CalendarCell[]) {
  const start = week[0]?.date ?? ''
  const end = week[6]?.date ?? start
  const monthName = (date: string) => {
    const [year, month] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)))
  }
  const dayNum = (date: string) => Number(date.slice(8, 10))
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${dayNum(start)} – ${dayNum(end)} de ${monthName(start)}`
  }
  return `${dayNum(start)} de ${monthName(start)} – ${dayNum(end)} de ${monthName(end)}`
}
