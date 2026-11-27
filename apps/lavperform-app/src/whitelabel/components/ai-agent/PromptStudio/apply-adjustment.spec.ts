import { describe, expect, it } from 'vitest'

import { applyAdjustment } from './apply-adjustment'

const document = {
  contextPrompt: 'contexto',
  systemPrompt: 'sistema',
  behaviorGuidelines: 'regras',
  guardrails: 'limites',
}

describe('applyAdjustment', () => {
  it('troca só o contexto de negócio', () => {
    expect(
      applyAdjustment(document, {
        summary: 'x',
        changes: { contextPrompt: 'novo', systemPrompt: 'outro', guardrails: 'outros' },
      })
    ).toEqual({ ...document, contextPrompt: 'novo' })
  })

  it('recusa proposta sem contexto, para a ficha não ser gravada sozinha', () => {
    expect(() =>
      applyAdjustment(document, { summary: 'x', changes: { guardrails: 'outros' } })
    ).toThrow('O texto mudou. Peça a alteração de novo.')
  })
})
