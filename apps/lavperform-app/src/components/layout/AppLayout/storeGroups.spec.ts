import { describe, expect, it } from 'vitest'

import { initials } from './storeGroups'

describe('iniciais da loja', () => {
  it('monta as iniciais do nome', () => {
    expect(initials('Lavanderia Bolha Azul')).toBe('LB')
    expect(initials('Centro')).toBe('CE')
    expect(initials('')).toBe('?')
  })
})
