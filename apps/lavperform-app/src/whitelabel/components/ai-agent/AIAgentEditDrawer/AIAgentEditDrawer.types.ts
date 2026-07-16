import type { AIAgent } from '@/whitelabel/types'

export interface Props {
  agent: AIAgent
  isOpen: boolean
  onClose: () => void
}
