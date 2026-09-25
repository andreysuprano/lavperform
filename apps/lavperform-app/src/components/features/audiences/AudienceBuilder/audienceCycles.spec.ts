import { describe, expect, it } from 'vitest'

import { CRITERION_LABELS, formatCriterionSummary } from './audienceCopy'

describe('total_cycles audience criterion', () => {
  it('labels the filter as quantidade de ciclos', () => {
    expect(CRITERION_LABELS.total_cycles).toBe('Quantidade de ciclos')
  })

  it('summarizes the comparison and the sales period', () => {
    expect(
      formatCriterionSummary({
        type: 'total_cycles',
        operator: 'gt',
        value: 10,
        period: { from: '2026-09-01', to: '2026-09-30' },
      }),
    ).toBe(
      'Quantidade de ciclos: é maior que 10 (vendas entre 2026-09-01 e 2026-09-30)',
    )
  })
})
