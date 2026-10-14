import { Tabs, useTabs } from '@chakra-ui/react'
import { memo } from 'react'

import { CustomDrawer } from '@/components'
import type { AIAgent } from '@/whitelabel/types'

import {
  FiltersTab,
  JourneyTab,
  McpTab,
  MediaTab,
  PersonaTab,
  RagTab,
} from '../tabs'

interface Props {
  agent: AIAgent
  isOpen: boolean
  onClose: () => void
}

function AdvancedConfigTabs({ agent }: { agent: AIAgent }) {
  const tabs = useTabs({ defaultValue: 'persona' })

  return (
    <Tabs.RootProvider value={tabs}>
      <Tabs.List mb={4} overflowX="auto">
        <Tabs.Trigger value="persona">Persona</Tabs.Trigger>
        <Tabs.Trigger value="media">Mídia</Tabs.Trigger>
        <Tabs.Trigger value="filters">Filtros</Tabs.Trigger>
        <Tabs.Trigger value="journey">Jornada</Tabs.Trigger>
        <Tabs.Trigger value="rag">Base RAG</Tabs.Trigger>
        <Tabs.Trigger value="mcp">Ferramentas MCP</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="persona">
        <PersonaTab agent={agent} />
      </Tabs.Content>
      <Tabs.Content value="media">
        <MediaTab agent={agent} />
      </Tabs.Content>
      <Tabs.Content value="filters">
        <FiltersTab agent={agent} />
      </Tabs.Content>
      <Tabs.Content value="journey">
        <JourneyTab agent={agent} />
      </Tabs.Content>
      <Tabs.Content value="rag">
        <RagTab agent={agent} />
      </Tabs.Content>
      <Tabs.Content value="mcp">
        <McpTab agent={agent} />
      </Tabs.Content>
    </Tabs.RootProvider>
  )
}

function AIAgentAdvancedConfigDrawerBase({ agent, isOpen, onClose }: Props) {
  return (
    <CustomDrawer
      isOpen={isOpen}
      lazyMount
      unmountOnExit
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      size="xl"
      title="Configuração avançada"
    >
      {isOpen ? <AdvancedConfigTabs agent={agent} /> : null}
    </CustomDrawer>
  )
}

const AIAgentAdvancedConfigDrawer = memo(AIAgentAdvancedConfigDrawerBase)

export { AIAgentAdvancedConfigDrawer }
