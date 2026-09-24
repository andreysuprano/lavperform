import type { CommunicationStyleType, VoiceToneType } from './ai-agent.types'

export interface QuestionnaireAnswers {
  services: string
  focus: string
  mustNotPromise: string
  hoursAndDeadline?: string
  pricing?: string
  handoff?: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
}

export interface PromptDocument {
  contextPrompt: string
  systemPrompt: string
  behaviorGuidelines: string
  guardrails: string
}

export type PromptField = keyof PromptDocument

export interface PromptProposal {
  summary: string
  changes: Partial<PromptDocument>
  baseUpdatedAt?: string
}

export interface GeneratePromptStudioResult {
  document: PromptDocument
  suggestedQuestions: string[]
}

export interface TestPromptStudioResult {
  answer: string
}

export interface ProposePromptStudioPayload {
  document: PromptDocument
  question: string
  answer: string
  whatWasWrong: string
  baseUpdatedAt?: string
  currentUpdatedAt: string | null
  draftChanged: boolean
  modelName?: string
}
