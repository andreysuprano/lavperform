import { describe, expect, it } from 'vitest'

import { mapMonthlySalesToPerformance } from './mapDashboardPerformance'

describe('mapMonthlySalesToPerformance', () => {
  it('maps today cycleCount to dailyCycleCount', () => {
    expect(
      mapMonthlySalesToPerformance({
        today: { count: 2, totalValue: 50, cycleCount: 5 },
        series: [],
      }).summary,
    ).toEqual({
      dailySalesAmount: 50,
      dailySalesCount: 2,
      dailyCycleCount: 5,
    })
  })
})
