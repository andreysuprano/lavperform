import { describe, expect, it } from 'vitest'

import { nextWizardKey, wizardChoice, wizardQuestion } from './wizard-steps'

const empty = {
  agentName: '',
  agentObjective: '',
  answers: {} as Record<string, string>,
}

describe('wizard steps', () => {
  it('abre na primeira pergunta vazia, começando por nome e objetivo', () => {
    expect(nextWizardKey('SELF_SERVICE', empty)).toBe('agentName')
    expect(
      nextWizardKey('SELF_SERVICE', { ...empty, agentName: 'Aria' }),
    ).toBe('agentObjective')
    expect(
      nextWizardKey('CONVENTIONAL', {
        agentName: 'Aria',
        agentObjective: 'Atender',
        answers: {},
      }),
    ).toBe('name')
  })

  it('retoma o rascunho na próxima pergunta vazia', () => {
    expect(
      nextWizardKey('SELF_SERVICE', {
        agentName: 'Aria',
        agentObjective: 'Atender',
        answers: { name: 'Lav', phone: '' },
      }),
    ).toBe('phone')
  })

  it('cadastro com valor oferece esse valor e cadastro vazio pede texto', () => {
    expect(wizardChoice('name', 'SELF_SERVICE', 'Lav Teste')).toEqual({
      options: ['Lav Teste'],
      textOnly: false,
    })
    expect(wizardChoice('phone', 'SELF_SERVICE', null)).toEqual({
      options: [],
      textOnly: true,
    })
    expect(wizardChoice('agentName', 'SELF_SERVICE', 'Lav Teste').options).toEqual([
      'Lav Teste',
    ])
  })

  it('não grava Outra resposta como opção pronta', () => {
    const choice = wizardChoice('payPix', 'SELF_SERVICE', null)
    expect(choice.options).toEqual(['Sim', 'Não', 'Não se aplica'])
    expect(choice.options).not.toContain('Outra resposta')
    expect(wizardQuestion('priceWash', 'CONVENTIONAL')).toMatch(/preço da lavagem/i)
  })
})
