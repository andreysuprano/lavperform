import { describe, expect, it } from 'vitest'
import { getMonthLabel, MONTH_OPTIONS } from './monthOptions'

describe('MONTH_OPTIONS', () => {
  it('maps Portuguese month labels to values 1 through 12', () => {
    expect(MONTH_OPTIONS).toHaveLength(12)
    expect(MONTH_OPTIONS[0]).toEqual({ value: 1, label: 'Janeiro' })
    expect(MONTH_OPTIONS[11]).toEqual({ value: 12, label: 'Dezembro' })
    expect(getMonthLabel(5)).toBe('Maio')
  })
})
