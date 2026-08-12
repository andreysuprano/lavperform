import { memo } from 'react'

import type { AIAgent } from '@/whitelabel/types'

import { AIAgentKnowledgeBaseCard } from '../AIAgentKnowledgeBaseCard'

interface RagTabProps {
  agent: AIAgent
}

function RagTabBase({ agent }: RagTabProps) {
  return <AIAgentKnowledgeBaseCard agentId={agent.id} disabled={!agent.active} />
}

const RagTab = memo(RagTabBase) as typeof RagTabBase

export { RagTab }
