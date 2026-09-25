import { describe, expect, it } from 'vitest'

import {
  advanceFinishResume,
  initialFinishResume,
  nextFinishPhase,
  shouldCreateAgent,
} from './wizard-finish-resume'

describe('wizard-finish-resume', () => {
  it('starts with create when no agent id is stored', () => {
    const state = initialFinishResume()
    expect(shouldCreateAgent(state)).toBe(true)
    expect(nextFinishPhase(state)).toBe('create')
  })

  it('skips create and continues at adopt after create succeeds', () => {
    const state = advanceFinishResume(initialFinishResume(), {
      type: 'created',
      agentId: 'agent-1',
    })
    expect(shouldCreateAgent(state)).toBe(false)
    expect(nextFinishPhase(state)).toBe('adopt')
    expect(state.agentId).toBe('agent-1')
  })

  it('continues at persona after adopt succeeds', () => {
    let state = advanceFinishResume(initialFinishResume(), {
      type: 'created',
      agentId: 'agent-1',
    })
    state = advanceFinishResume(state, { type: 'adopted' })
    expect(shouldCreateAgent(state)).toBe(false)
    expect(nextFinishPhase(state)).toBe('persona')
  })

  it('continues at media after persona succeeds', () => {
    let state = advanceFinishResume(initialFinishResume(), {
      type: 'created',
      agentId: 'agent-1',
    })
    state = advanceFinishResume(state, { type: 'adopted' })
    state = advanceFinishResume(state, { type: 'personaSaved' })
    expect(nextFinishPhase(state)).toBe('media')
  })

  it('keeps the same agent id across a failed mid-flow retry', () => {
    const afterCreate = advanceFinishResume(initialFinishResume(), {
      type: 'created',
      agentId: 'agent-1',
    })
    // adopt failed — resume unchanged; retry must not create again
    expect(shouldCreateAgent(afterCreate)).toBe(false)
    expect(nextFinishPhase(afterCreate)).toBe('adopt')
    expect(afterCreate.agentId).toBe('agent-1')
  })
})
