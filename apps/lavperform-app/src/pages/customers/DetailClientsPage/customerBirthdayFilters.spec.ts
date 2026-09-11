import { describe, expect, it } from 'vitest'

import {
  clearBirthMonthForFilter,
  formatCustomerBirthDate,
  isBirthMonthVisible,
} from './customerBirthdayFilters'

describe('customer birthday filters', () => {
  it('hides and clears month when customers without birth date are selected', () => {
    expect(isBirthMonthVisible(['false'])).toBe(false)
    expect(clearBirthMonthForFilter(['false'], 5)).toBeUndefined()
  })

  it('keeps month visible for all customers or customers with birth date', () => {
    expect(isBirthMonthVisible([])).toBe(true)
    expect(isBirthMonthVisible(['true'])).toBe(true)
    expect(clearBirthMonthForFilter(['true'], 5)).toBe(5)
  })

  it('formats birth dates in UTC and preserves the calendar day', () => {
    expect(formatCustomerBirthDate('2000-03-01T00:00:00.000Z')).toBe(
      '01/03/2000'
    )
    expect(formatCustomerBirthDate(null)).toBe('-')
  })
})
