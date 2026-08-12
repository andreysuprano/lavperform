import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Switch,
  Tabs,
  Text,
  useTabs,
} from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { LuBot } from 'react-icons/lu'
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiRefreshLine,
} from 'react-icons/ri'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  AppContentLayout,
  DeleteConfirmationDialog,
  Empty,
  LoadingState,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  ConversationsTab,
  FiltersTab,
  JourneyTab,
  McpTab,
  MediaTab,
  PersonaTab,
  RagTab,
} from '@/whitelabel/components/ai-agent/tabs'
import {
  useAIAgent,
  useDeleteAIAgent,
  useToggleAIAgent,
  useUpdateAIAgentWebhook,
} from '@/whitelabel/hooks'

const AI_AGENT_LIST_PATH = '/whitelabel/ai-agent'

const TAB_VALUES = [
  'persona',
  'media',
  'filters',
  'journey',
  'rag',
  'mcp',
  'conversations',
] as const

const TAB_ALIASES: Record<string, (typeof TAB_VALUES)[number]> = {
  conversas: 'conversations',
  conversations: 'conversations',
}

function AIAgentDetailPageBase() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedCompany } = useAuth()

  const { data: agent, isLoading, isError } = useAIAgent(
    selectedCompany?.id,
    agentId
  )
  const toggleAgent = useToggleAIAgent()
  const deleteAgent = useDeleteAIAgent()
  const updateWebhook = useUpdateAIAgentWebhook()

  const initialTab = useMemo(() => {
    const raw = searchParams.get('tab')
    if (!raw) return 'persona'
    return (
      TAB_ALIASES[raw] ??
      (TAB_VALUES.includes(raw as (typeof TAB_VALUES)[number])
        ? (raw as (typeof TAB_VALUES)[number])
        : 'persona')
    )
  }, [searchParams])

  const tabs = useTabs({ defaultValue: initialTab })

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
        {agent.description && (
          <Text fontSize="sm" color="fg.muted" lineClamp={1}>
            {agent.description}
          </Text>
        )}
      </HStack>

      <Box mt={2}>
        <Tabs.RootProvider value={tabs}>
          <Tabs.List mb={4} overflowX="auto">
            <Tabs.Trigger value="persona">Persona</Tabs.Trigger>
            <Tabs.Trigger value="media">Mídia</Tabs.Trigger>
            <Tabs.Trigger value="filters">Filtros</Tabs.Trigger>
            <Tabs.Trigger value="journey">Jornada</Tabs.Trigger>
            <Tabs.Trigger value="rag">Base RAG</Tabs.Trigger>
            <Tabs.Trigger value="mcp">Ferramentas MCP</Tabs.Trigger>
            <Tabs.Trigger value="conversations">Conversas</Tabs.Trigger>
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
          <Tabs.Content value="conversations">
            <ConversationsTab agent={agent} />
          </Tabs.Content>
        </Tabs.RootProvider>
      </Box>
    </AppContentLayout>
  )
}

const AIAgentDetailPage = memo(AIAgentDetailPageBase)

export { AIAgentDetailPage }
