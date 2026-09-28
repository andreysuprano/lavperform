import { describe, expect, it } from 'vitest'

import { scriptFor } from './sheet-script'
import { nextConversationStep } from './conversation-steps'

const filledSheet = Object.fromEntries(
  scriptFor('CONVENTIONAL').map((field) => [field.key, 'sim'])
)

const intro = { agentName: 'Teste', agentDescription: 'Atender no WhatsApp' }

describe('nextConversationStep', () => {
  it('asks the agent name before the laundry sheet', () => {
    expect(
      nextConversationStep({
        intro: { agentName: '  ', agentDescription: '' },
        sheetModel: 'CONVENTIONAL',
        sheetAnswers: {},
        media: '',
        hasDocument: false,
      }).phase
    ).toBe('ask-intro')
  })

  it('asks for a file after the sheet and accepts Não tem', () => {
    expect(
      nextConversationStep({
        intro,
        sheetModel: 'CONVENTIONAL',
        sheetAnswers: filledSheet,
        media: '',
        hasDocument: false,
      }).phase
    ).toBe('ask-media')

    expect(
      nextConversationStep({
        intro,
        sheetModel: 'CONVENTIONAL',
        sheetAnswers: filledSheet,
        media: 'Não tem',
        hasDocument: false,
      }).phase
    ).toBe('generate')
  })

  it('opens the test only after the prompt exists', () => {
    expect(
      nextConversationStep({
        intro,
        sheetModel: 'CONVENTIONAL',
        sheetAnswers: filledSheet,
        media: 'Não tem',
        hasDocument: true,
      }).phase
    ).toBe('test')
  })
})
