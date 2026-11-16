import { describe, expect, it } from 'vitest'

import { audiencePeriodError } from './audienceCopy'

describe('período da audiência', () => {
  it('pede para corrigir quando a data inicial vem depois da final', () => {
    expect(
      audiencePeriodError({
        include: {
          operator: 'AND',
          rules: [
            {
              type: 'total_orders',
              operator: 'gte',
              value: 3,
              period: { from: '2026-10-31', to: '2026-10-15' },
            },
          ],
        },
      }),
    ).toBe('A data inicial precisa ser anterior ou igual à data final.')
  })

  it('aceita o período quando a data final é 15/11', () => {
    expect(
      audiencePeriodError({
        include: {
          operator: 'AND',
          rules: [
            {
              type: 'total_orders',
              operator: 'gte',
              value: 3,
              period: { from: '2026-10-31', to: '2026-11-15' },
            },
          ],
        },
      }),
    ).toBeNull()
  })
})
