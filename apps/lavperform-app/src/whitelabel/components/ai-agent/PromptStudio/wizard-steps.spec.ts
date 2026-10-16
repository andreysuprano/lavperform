import { describe, expect, it } from 'vitest'

import { CADASTRO_KEYS } from './sheet-script'
import {
  laundryModelFromLabel,
  nextWizardKey,
  objectiveFor,
  wizardChoice,
  wizardKeys,
  wizardQuestion,
  wizardShownAnswer,
  wizardStepFilled,
  wizardStepForMissing,
} from './wizard-steps'

const empty = {
  agentName: '',
  agentObjective: '',
  answers: {} as Record<string, string>,
}

const storeAnswers = Object.fromEntries(CADASTRO_KEYS.map((key) => [key, 'ok']))

describe('wizard steps', () => {
  it('pergunta o nome, o tipo da lavanderia e confirma a loja', () => {
    expect(nextWizardKey('SELF_SERVICE', empty)).toBe('agentName')
    expect(nextWizardKey('SELF_SERVICE', { ...empty, agentName: 'Aria' })).toBe('laundryType')
    expect(
      nextWizardKey('SELF_SERVICE', {
        ...empty,
        agentName: 'Aria',
        agentObjective: objectiveFor('SELF_SERVICE'),
      }),
    ).toBe('store')
    expect(
      nextWizardKey('SELF_SERVICE', {
        agentName: 'Aria',
        agentObjective: objectiveFor('SELF_SERVICE'),
        answers: storeAnswers,
      }),
    ).toBe('referencePoint')
    expect(wizardKeys('CONVENTIONAL')).not.toContain('phone')
    expect(wizardKeys('CONVENTIONAL')).not.toContain('agentObjective')
  })

  it('retoma a confirmação da loja quando falta um dado do cadastro', () => {
    expect(
      nextWizardKey('SELF_SERVICE', {
        agentName: 'Aria',
        agentObjective: objectiveFor('SELF_SERVICE'),
        answers: { ...storeAnswers, phone: '' },
      }),
    ).toBe('store')
    expect(wizardStepForMissing('phone')).toBe('store')
  })

  it('oferece auto serviço ou convencional e define o objetivo', () => {
    expect(wizardChoice('laundryType', 'CONVENTIONAL', null).options).toEqual([
      'Auto serviço',
      'Convencional',
    ])
    expect(laundryModelFromLabel('Auto serviço')).toBe('SELF_SERVICE')
    expect(objectiveFor('CONVENTIONAL')).toBe(
      'Responder os clientes de uma lavanderia convencional.',
    )
    expect(wizardQuestion('laundryType', 'CONVENTIONAL')).toMatch(/tipo|auto serviço|convencional/i)
    expect(wizardQuestion('store', 'CONVENTIONAL')).toMatch(/dados da loja/i)
  })

  it('mostra só a resposta já gravada', () => {
    expect(wizardStepFilled('agentName', empty)).toBe(false)
    expect(wizardStepFilled('agentName', { ...empty, agentName: 'Aria' })).toBe(true)
    expect(wizardShownAnswer('agentName', 'CONVENTIONAL', { ...empty, agentName: 'Aria' })).toBe('Aria')
    expect(
      wizardShownAnswer('laundryType', 'SELF_SERVICE', {
        ...empty,
        agentObjective: objectiveFor('SELF_SERVICE'),
      })
    ).toBe('Auto serviço')
    expect(
      wizardShownAnswer('payPix', 'CONVENTIONAL', {
        ...empty,
        answers: { payPix: 'Sim' },
      })
    ).toBe('Sim')
    expect(
      wizardShownAnswer('store', 'CONVENTIONAL', {
        agentName: 'Aria',
        agentObjective: 'x',
        answers: {
          ...storeAnswers,
          name: 'Loja',
          phone: '119',
          address: 'Rua A',
          hours_seg: '8h às 18h',
          hours_ter: '8h às 18h',
          hours_qua: '8h às 18h',
          hours_qui: '8h às 18h',
          hours_sex: '8h às 18h',
          hours_sab: '8h às 18h',
          hours_dom: '8h às 18h',
        },
      })
    ).toBe('Loja\n119\nRua A\n8h às 18h')
    expect(
      wizardShownAnswer('store', 'CONVENTIONAL', {
        agentName: 'Aria',
        agentObjective: 'x',
        answers: { ...storeAnswers, hours_seg: '8h', hours_dom: 'Fechado' },
      })
    ).toContain('Horário diferente por dia')
  })

  it('não grava Outra resposta como opção pronta', () => {
    const choice = wizardChoice('payPix', 'SELF_SERVICE', null)
    expect(choice.options).toEqual(['Sim', 'Não', 'Não se aplica'])
    expect(choice.options).not.toContain('Outra resposta')
    expect(wizardQuestion('priceWash', 'CONVENTIONAL')).toMatch(/preço da lavagem/i)
  })
})
