import { convertISOToDate } from '@/utils/convertISOToDate'
import { EMPTY_PLACEHOLDER } from '@/utils/strings'

export type BirthDatePresenceFilter = 'true' | 'false'

export function isBirthMonthVisible(
  values: BirthDatePresenceFilter[]
): boolean {
  return values[0] !== 'false'
}

export function clearBirthMonthForFilter(
  values: BirthDatePresenceFilter[],
  month: number | undefined
): number | undefined {
  return isBirthMonthVisible(values) ? month : undefined
}

export function formatCustomerBirthDate(birthDate: string | null): string {
  return birthDate
    ? convertISOToDate(birthDate, { timeZone: 'UTC' })
    : EMPTY_PLACEHOLDER
}
