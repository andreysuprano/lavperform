import type { AIAgent } from '@/whitelabel/types'

export interface Props {
  mode: 'create' | 'edit'
  agentId?: string
  initialData?: AIAgent
  onClose: () => void
}
