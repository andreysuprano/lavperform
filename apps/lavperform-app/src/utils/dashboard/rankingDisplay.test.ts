import { describe, expect, it } from 'vitest'

import {
  getPurchaseRankSubtitle,
  getRankingsIntro,
  isSelfServiceModel,
} from './rankingDisplay'

describe('rankingDisplay', () => {
  it('treats missing and CONVENTIONAL as not self-service', () => {
    expect(isSelfServiceModel(undefined)).toBe(false)
    expect(isSelfServiceModel('CONVENTIONAL')).toBe(false)
  })

  it('treats SELF_SERVICE as self-service', () => {
    expect(isSelfServiceModel('SELF_SERVICE')).toBe(true)
  })

  it('uses sales copy for conventional rankings', () => {
    expect(getPurchaseRankSubtitle('month', false)).toBe(
      'Ordenado pelo número de vendas neste mês',
    )
    expect(getRankingsIntro(false)).toContain('número de vendas')
  })

  it('uses cycle copy for self-service rankings', () => {
    expect(getPurchaseRankSubtitle('history', true)).toBe(
      'Ordenado pelo número de ciclos',
    )
    expect(getRankingsIntro(true)).toContain('número de ciclos')
  })
})
