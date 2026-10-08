import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useRef } from 'react'
import { LuBot } from 'react-icons/lu'
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiRefreshLine,
} from 'react-icons/ri'
import { useNavigate, useParams } from 'react-router-dom'

import {
  AppContentLayout,
  DeleteConfirmationDialog,
  Empty,
  LoadingState,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { ConversationsTab } from '@/whitelabel/components/ai-agent/tabs'
import {
  useAIAgent,
  useDeleteAIAgent,
  useToggleAIAgent,
  useUpdateAIAgentWebhook,
} from '@/whitelabel/hooks'

const AI_AGENT_LIST_PATH = '/whitelabel/ai-agent'

function AIAgentDetailPageBase() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()

  const { data: agent, isLoading, isError } = useAIAgent(
    selectedCompany?.id,
    agentId
  )
  const toggleAgent = useToggleAIAgent()
  const deleteAgent = useDeleteAIAgent()
  const updateWebhook = useUpdateAIAgentWebhook()
  const companyIdWhenMounted = useRef(selectedCompany?.id)

  useEffect(() => {
    if (!selectedCompany?.id) return
    if (
      companyIdWhenMounted.current &&
      companyIdWhenMounted.current !== selectedCompany.id
    ) {
      navigate(AI_AGENT_LIST_PATH, { replace: true })
    }
    companyIdWhenMounted.current = selectedCompany.id
  }, [selectedCompany?.id, navigate])

  const goBack = useCallback(() => {
    navigate(AI_AGENT_LIST_PATH)
  }, [navigate])

  const handleDelete = useCallback(async () => {
    if (!agentId) return
    await deleteAgent.mutateAsync(agentId)
    navigate(AI_AGENT_LIST_PATH)
  }, [agentId, deleteAgent, navigate])

  if (isLoading) {
    return (
      <AppContentLayout icon={<LuBot />} title="Agente de IA">
        <LoadingState title="Carregando agente..." />
      </AppContentLayout>
    )
  }

  if (isError || !agent) {
    return (
      <AppContentLayout icon={<LuBot />} title="Agente de IA">
        <Empty
          title="Agente não encontrado"
          description="Não foi possível carregar este agente. Volte para a lista e tente novamente."
        />
        <Button variant="outline" alignSelf="flex-start" onClick={goBack}>
          <RiArrowLeftLine />
          Voltar para a lista
        </Button>
      </AppContentLayout>
    )
  }

  const headerActions = (
    <HStack gap={2} flexWrap="wrap" ml="auto">
      <Button
        size="sm"
        variant="outline"
        onClick={() => updateWebhook.mutate(agent.id)}
        loading={updateWebhook.isPending}
      >
        <RiRefreshLine />
        Atualizar webhook
      </Button>

      <HStack gap={2}>
        <Switch.Root
          checked={agent.active}
          onCheckedChange={() => toggleAgent.mutate(agent.id)}
          disabled={toggleAgent.isPending}
          size="md"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
        <Badge colorPalette={agent.active ? 'green' : 'gray'} variant="subtle">
          {agent.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </HStack>

      <DeleteConfirmationDialog
        title="Excluir agente de IA"
        description={`Tem certeza que deseja excluir o agente "${agent.name}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteAgent.isPending}
        onClick={handleDelete}
        trigger={
          <IconButton
            size="sm"
            variant="ghost"
            colorPalette="red"
            aria-label="Excluir agente"
          >
            <RiDeleteBinLine />
          </IconButton>
        }
      />
    </HStack>
  )

  return (
    <AppContentLayout icon={<LuBot />} title={agent.name} action={headerActions}>
      <HStack gap={3}>
        <Button size="xs" variant="ghost" onClick={goBack}>
          <RiArrowLeftLine />
          Agentes de IA
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => navigate(`/whitelabel/ai-agent/${agent.id}/conversa`)}
        >
          Configurar
        </Button>
        {agent.description && (
          <Text fontSize="sm" color="fg.muted" lineClamp={1}>
            {agent.description}
          </Text>
        )}
      </HStack>

      <Box mt={2}>
        <ConversationsTab
          key={`${selectedCompany?.id}-${agent.id}`}
          agent={agent}
        />
      </Box>
    </AppContentLayout>
  )
}

const AIAgentDetailPage = memo(AIAgentDetailPageBase)

export { AIAgentDetailPage }
