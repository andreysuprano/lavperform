export type PromptStudioServiceModel = 'CONVENTIONAL' | 'SELF_SERVICE'

export interface GeneratePromptStudioPayload {
  model: PromptStudioServiceModel
  answers: Record<string, string>
  modelName?: string
}

export type PromptSheetSnapshot = {
  name: string | null
  phone: string | null
  address: {
    street: string | null
    number: string | null
    complement: string | null
    neighborhood: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  }
  openingHours: Array<{
    dayOfWeek: string
    openTime: string
    closeTime: string
    isOpen: boolean
  }>
}

export type PromptSheetResponse = {
  serviceModel: PromptStudioServiceModel
  snapshot: PromptSheetSnapshot
  answers: Record<string, string>
  updatedAt: string | null
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
  sheetUpdatedAt?: string
  answerKey?: string
  answerValue?: string
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
  sheetUpdatedAt: string
  modelName?: string
}
