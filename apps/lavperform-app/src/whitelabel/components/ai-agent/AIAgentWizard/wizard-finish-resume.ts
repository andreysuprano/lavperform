export type FinishPhase = 'create' | 'adopt' | 'persona' | 'media'

export type FinishResumeState = {
  agentId: string | null
  /** Last phase that completed successfully; null means nothing done yet. */
  lastCompleted: FinishPhase | null
}

export type FinishResumeEvent =
  | { type: 'created'; agentId: string }
  | { type: 'adopted' }
  | { type: 'personaSaved' }
  | { type: 'mediaSaved' }

export function initialFinishResume(): FinishResumeState {
  return { agentId: null, lastCompleted: null }
}

export function shouldCreateAgent(state: FinishResumeState): boolean {
  return state.agentId == null
}

export function nextFinishPhase(state: FinishResumeState): FinishPhase {
  if (state.agentId == null) return 'create'
  if (state.lastCompleted === null || state.lastCompleted === 'create') {
    return 'adopt'
  }
  if (state.lastCompleted === 'adopt') return 'persona'
  return 'media'
}

export function advanceFinishResume(
  state: FinishResumeState,
  event: FinishResumeEvent
): FinishResumeState {
  switch (event.type) {
    case 'created':
      return { agentId: event.agentId, lastCompleted: 'create' }
    case 'adopted':
      return { ...state, lastCompleted: 'adopt' }
    case 'personaSaved':
      return { ...state, lastCompleted: 'persona' }
    case 'mediaSaved':
      return { ...state, lastCompleted: 'media' }
  }
}
