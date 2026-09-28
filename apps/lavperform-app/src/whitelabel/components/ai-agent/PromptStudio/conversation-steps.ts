import { scriptFor, type ServiceModel } from './sheet-script'

export const INTRO_FIELDS = [
  {
    key: 'agentName' as const,
    label: 'Nome do agente',
    question: 'Qual é o nome do agente?',
  },
  {
    key: 'agentDescription' as const,
    label: 'Descrição',
    question: 'Descreva o objetivo principal deste agente.',
  },
]

export const MEDIA_FIELD = {
  key: 'media' as const,
  label: 'Mídia',
  question:
    'Envie uma imagem, um áudio ou um vídeo para o agente. Se não tiver arquivo, marque Não tem.',
}

export type ConversationStep =
  | {
      phase: 'ask-intro'
      key: 'agentName' | 'agentDescription'
      label: string
      question: string
    }
  | { phase: 'wait-sheet' }
  | { phase: 'ask-sheet' }
  | { phase: 'ask-media' }
  | { phase: 'generate' }
  | { phase: 'test' }

export function nextConversationStep(input: {
  intro: { agentName: string; agentDescription: string }
  sheetModel: ServiceModel | null
  sheetAnswers: Record<string, string>
  media: string
  hasDocument: boolean
}): ConversationStep {
  const introField = INTRO_FIELDS.find(
    (field) => input.intro[field.key].trim() === ''
  )
  if (introField) {
    return {
      phase: 'ask-intro',
      key: introField.key,
      label: introField.label,
      question: introField.question,
    }
  }

  if (!input.sheetModel) {
    return { phase: 'wait-sheet' }
  }

  const pendingSheet = scriptFor(input.sheetModel).some(
    (field) => (input.sheetAnswers[field.key] ?? '').trim() === ''
  )
  if (pendingSheet) {
    return { phase: 'ask-sheet' }
  }

  if (input.media.trim() === '') {
    return { phase: 'ask-media' }
  }

  if (!input.hasDocument) {
    return { phase: 'generate' }
  }

  return { phase: 'test' }
}
