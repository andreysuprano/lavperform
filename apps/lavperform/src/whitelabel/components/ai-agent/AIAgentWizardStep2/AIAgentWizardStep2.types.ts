import type { Control } from 'react-hook-form'

import type { CommunicationStyleType, VoiceToneType } from '@/whitelabel/types'

export interface Step2FormData {
  personaName: string
  systemPrompt: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
  language: 'PT_BR'
  behaviorGuidelines: string
  guardrails: string
}

export interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<Step2FormData, any, any>
  agentName?: string
}
