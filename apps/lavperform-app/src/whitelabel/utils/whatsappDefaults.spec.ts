import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WHATSAPP_MESSAGE,
  buildWhatsappUrl,
  toWhatsappDigits,
  withWhatsappDefaults,
} from './whatsappDefaults'

const cta = {
  title: 'Pronto?',
  description: 'Venha conhecer',
  buttonText: 'Chamar',
  whatsappNumber: '5548999999999',
}

describe('toWhatsappDigits', () => {
  it('mantém número que já tem DDI', () => {
    expect(toWhatsappDigits('5548999887766')).toBe('5548999887766')
  })

  it('trata 55 inicial de 11 dígitos como DDD', () => {
    expect(toWhatsappDigits('(55) 99987-2474')).toBe('5555999872474')
  })

  it('prefixa 55 em celular com DDD', () => {
    expect(toWhatsappDigits('(48) 99999-8888')).toBe('5548999998888')
  })
})

describe('withWhatsappDefaults', () => {
  it('troca o placeholder pelo telefone do cadastro', () => {
    expect(
      withWhatsappDefaults(cta, '(11) 98888-7777').whatsappNumber
    ).toBe('5511988887777')
  })

  it('preserva um número já personalizado na landing page', () => {
    expect(
      withWhatsappDefaults(
        { ...cta, whatsappNumber: '5548988776655' },
        '(11) 98888-7777'
      ).whatsappNumber
    ).toBe('5548988776655')
  })

  it('preenche a mensagem padrão quando a LP ainda não tem texto', () => {
    expect(withWhatsappDefaults(cta).whatsappMessage).toBe(
      DEFAULT_WHATSAPP_MESSAGE
    )
  })

  it('mantém a mensagem salva', () => {
    expect(
      withWhatsappDefaults({ ...cta, whatsappMessage: 'Oi, quero lavar' })
        .whatsappMessage
    ).toBe('Oi, quero lavar')
  })
})

describe('buildWhatsappUrl', () => {
  it('monta o link com número e mensagem', () => {
    expect(buildWhatsappUrl('48999998888', 'Olá')).toBe(
      'https://wa.me/5548999998888?text=Ol%C3%A1'
    )
  })

  it('não gera link sem número', () => {
    expect(buildWhatsappUrl('')).toBeNull()
  })
})
