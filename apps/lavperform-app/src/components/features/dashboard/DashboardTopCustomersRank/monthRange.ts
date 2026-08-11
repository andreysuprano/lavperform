export type MonthSelection = {
  year: number
  monthIndex: number
}

export type MonthRange = {
  startDate: string
  endDate: string
  label: string
}

export type MonthOption = MonthSelection & {
  key: string
  label: string
}

function capitalizeLabel(label: string) {
  if (!label) return label
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function toDateOnly(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayPart = String(day).padStart(2, '0')
  return `${year}-${month}-${dayPart}`
}

export function formatMonthLabel(year: number, monthIndex: number) {
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1))

  return capitalizeLabel(label)
}

export function toMonthKey(selection: MonthSelection) {
  return `${selection.year}-${String(selection.monthIndex + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: string): MonthSelection | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null
  }

  return { year, monthIndex }
}

/** Range do mês civil em YYYY-MM-DD (contrato da API top buyers). */
export function getMonthRange(year: number, monthIndex: number): MonthRange {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()

  return {
    startDate: toDateOnly(year, monthIndex, 1),
    endDate: toDateOnly(year, monthIndex, lastDay),
    label: formatMonthLabel(year, monthIndex),
  }
}

export function getCurrentMonthSelection(now = new Date()): MonthSelection {
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  }
}

export function getCurrentMonthRange(now = new Date()): MonthRange {
  const { year, monthIndex } = getCurrentMonthSelection(now)
  return getMonthRange(year, monthIndex)
}

export function listSelectableMonths(
  count = 24,
  now = new Date()
): MonthOption[] {
  const safeCount = Math.max(1, count)
  const current = getCurrentMonthSelection(now)
  const options: MonthOption[] = []

  for (let offset = 0; offset < safeCount; offset += 1) {
    const date = new Date(current.year, current.monthIndex - offset, 1)
    const selection = {
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    }

    options.push({
      ...selection,
      key: toMonthKey(selection),
      label: formatMonthLabel(selection.year, selection.monthIndex),
    })
  }

  return options
}
