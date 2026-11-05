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
