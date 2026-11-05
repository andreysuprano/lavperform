import { describe, expect, it } from 'vitest'

import type { UserCompany } from '@/types'

import { filterStoreGroups, groupStores, initials, unitInitials } from './storeGroups'

function store(partial: Partial<UserCompany> & Pick<UserCompany, 'id' | 'name'>): UserCompany {
  return {
    avatarUrl: '',
    slug: partial.slug ?? partial.id,
    companyId: partial.companyId ?? partial.id,
    showIncentivizedSales: false,
    showTodayPurchases: false,
    serviceModel: 'CONVENTIONAL',
    ...partial,
  }
}

describe('lojas agrupadas', () => {
  it('agrupa pelo companyId e filtra pela busca', () => {
    const groups = groupStores([
      store({ id: '1', name: 'Bolha Azul — Batel', companyId: 'bolha', slug: 'batel' }),
      store({ id: '2', name: 'Bolha Azul — Centro', companyId: 'bolha', slug: 'centro' }),
      store({ id: '3', name: 'Express — Portão', companyId: 'express', slug: 'portao' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.label).toBe('Bolha Azul')
    expect(groups[0]?.stores).toHaveLength(2)
    expect(filterStoreGroups(groups, 'portao')[0]?.stores[0]?.name).toBe('Express — Portão')
  })

  it('monta iniciais da unidade', () => {
    expect(initials('Lavanderia Bolha Azul')).toBe('LB')
    expect(unitInitials('Bolha Azul — Água Verde')).toBe('AV')
    expect(unitInitials('Centro')).toBe('CE')
  })
})
