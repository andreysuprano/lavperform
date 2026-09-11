import { describe, expect, it, vi } from 'vitest'

import { createEmptyCriterion } from '@/types'

import { formatCriterionSummary } from './audienceCopy'

describe('birthday_in_month audience criterion', () => {
  it('starts with the current month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T12:00:00.000Z'))

    expect(createEmptyCriterion('birthday_in_month')).toEqual({
      type: 'birthday_in_month',
      operator: 'eq',
      value: 5,
    })

    vi.useRealTimers()
  })

  it('summarizes the selected month by name', () => {
    expect(
      formatCriterionSummary({
        type: 'birthday_in_month',
        operator: 'eq',
        value: 5,
      }),
    ).toBe('Faz aniversário em Maio')
  })
})
