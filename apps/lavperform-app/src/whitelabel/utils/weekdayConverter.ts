import { WEEKDAYS } from '@/utils/weekdays'

/**
 * Converte array de números (1-7) para array de strings curtas ('seg', 'ter', etc)
 * Usado para converter do WeekdaySelect para o formato da API
 */
export function weekdayNumbersToStrings(numbers: number[]): string[] {
  return numbers
    .map((num) => WEEKDAYS.find((day) => day.value === num)?.short)
    .filter((short): short is string => !!short)
}

/**
 * Converte array de strings curtas para array de números
 * Usado para converter do formato da API para o WeekdaySelect
 */
export function weekdayStringsToNumbers(strings: string[]): number[] {
  return strings
    .map((short) => WEEKDAYS.find((day) => day.short === short)?.value)
    .filter((value): value is number => !!value)
}
