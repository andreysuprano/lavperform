import { Button, ButtonGroup, SimpleGrid, Stack } from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'
import { RiAddLine } from 'react-icons/ri'
import { useLocation } from 'react-router-dom'

import { Empty, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useAIAgents, useDeleteAIAgent } from '@/whitelabel/hooks'
import { AIAgentWizardModal } from '@/whitelabel/pages/AIAgentWizardPage'
import type { AIAgent } from '@/whitelabel/types'

import { AIAgentListCard } from './AIAgentListCard'
import type { Props } from './AIAgentList.types'

function AIAgentListBase({ onAgentSelect: _onAgentSelect }: Props) {
  const { selectedCompany } = useAuth()
  const location = useLocation()
  const [wizardOpen, setWizardOpen] = useState(
    Boolean((location.state as { openWizard?: boolean } | null)?.openWizard)
  )
  const { data, isLoading, error } = useAIAgents(selectedCompany?.id)
  const deleteMutation = useDeleteAIAgent()

  const agents = data || []

  const handleDelete = useCallback(
    async (agent: AIAgent) => {
      if (!selectedCompany) return
      await deleteMutation.mutateAsync(agent.id)
    },
    [selectedCompany, deleteMutation]
  )

  const openWizard = () => setWizardOpen(true)

  if (isLoading) {
    return (
      <>
        <LoadingState title="Carregando agentes de IA..." />
        <AIAgentWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Empty
          title="Erro ao carregar agentes"
          description="Não foi possível carregar os agentes de IA. Tente novamente."
        />
        <AIAgentWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
      </>
    )
  }

  if (agents.length === 0) {
    return (
      <>
        <Empty
          title="Nenhum agente de IA criado"
          description={
            <Stack gap={4} align="center">
              <p>Crie seu primeiro agente de IA para começar a atender seus clientes automaticamente.</p>
              <ButtonGroup>
                <Button onClick={openWizard}>
                  <RiAddLine />
                  Criar agente de IA
                </Button>
              </ButtonGroup>
            </Stack>
          }
        />
        <AIAgentWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
      </>
    )
  }

  return (
    <Stack gap={4}>
      <Button onClick={openWizard} alignSelf="flex-start">
        <RiAddLine />
        Criar agente de IA
      </Button>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4} w="full">
        {agents.map((agent) => (
          <AIAgentListCard
            key={agent.id}
            agent={agent}
            isDeleting={deleteMutation.isPending}
            onDelete={handleDelete}
          />
        ))}
      </SimpleGrid>
      <AIAgentWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </Stack>
  )
}

const AIAgentList = memo(AIAgentListBase) as typeof AIAgentListBase

export { AIAgentList }
export type { Props as AIAgentListProps }
