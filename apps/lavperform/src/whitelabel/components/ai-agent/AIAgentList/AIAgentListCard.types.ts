import type { AIAgent } from '@/whitelabel/types'

export interface Props {
  agent: AIAgent
  onDelete: (agent: AIAgent) => void
  isDeleting?: boolean
}
