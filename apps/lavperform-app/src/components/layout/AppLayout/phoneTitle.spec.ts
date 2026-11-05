import { describe, expect, it } from 'vitest'

import { isTabActive, phoneShowsBack, phoneTitle } from './phoneTitle'

describe('títulos e abas do celular', () => {
  it('mantém o rótulo Tráfego e os nomes das abas do Figma', () => {
    expect(phoneTitle('/trafego')).toBe('Tráfego')
    expect(phoneTitle('/trafego/pixel')).toBe('Tráfego')
    expect(phoneTitle('/social/generator')).toBe('Social Media')
    expect(phoneTitle('/social/calendario')).toBe('Calendário de posts')
    expect(phoneTitle('/social/google')).toBe('Google Meu Negócio')
    expect(phoneTitle('/integrations')).toBe('Integrações')
    expect(phoneTitle('/campaigns/recurring-campaigns')).toBe('Fidelização')
    expect(phoneTitle('/mais')).toBe('Mais')
  })

  it('mostra voltar fora das raízes das abas', () => {
    expect(phoneShowsBack('/dashboard')).toBe(false)
    expect(phoneShowsBack('/customers')).toBe(false)
    expect(phoneShowsBack('/customers/CustomerBase')).toBe(true)
    expect(phoneShowsBack('/trocar-loja')).toBe(true)
    expect(phoneShowsBack('/settings/brand-identity')).toBe(true)
  })

  it('marca a aba pela rota', () => {
    expect(isTabActive('/customers/insights', '/customers')).toBe(true)
    expect(isTabActive('/social/revise/1/2', '/social/generator')).toBe(true)
    expect(isTabActive('/social/generator/abc', '/social/generator')).toBe(true)
    expect(isTabActive('/trocar-loja', '/mais')).toBe(true)
    expect(isTabActive('/campaigns', '/campaigns')).toBe(true)
  })
})
