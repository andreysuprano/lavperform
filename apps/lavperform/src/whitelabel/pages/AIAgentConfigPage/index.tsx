import { memo } from 'react'
import { LuBot } from 'react-icons/lu'

import { AppContentLayout } from '@/components'
import { AIAgentList } from '@/whitelabel/components'

function AIAgentConfigPageBase() {
  return (
    <AppContentLayout icon={<LuBot />} title="Agentes de IA">
      <AIAgentList />
    </AppContentLayout>
  )
}

const AIAgentConfigPage = memo(AIAgentConfigPageBase)

export { AIAgentConfigPage }
