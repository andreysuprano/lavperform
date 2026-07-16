import type {
  LanguageType,
  PersonalityType,
  ResponseStyleType,
} from '@/whitelabel/types'

export interface Props {
  personality?: PersonalityType
  responseStyle?: ResponseStyleType
  language?: LanguageType
  prompt?: string
  onPersonalityChange?: (personality: PersonalityType) => void
  onResponseStyleChange?: (style: ResponseStyleType) => void
  onLanguageChange?: (language: LanguageType) => void
  onPromptChange?: (prompt: string) => void
}
