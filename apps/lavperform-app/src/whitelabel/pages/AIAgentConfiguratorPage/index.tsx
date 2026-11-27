import { Box, Button, Flex, HStack, IconButton, Input, Spinner, Stack, Switch, Text } from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LuCheck, LuRefreshCw, LuSave, LuSend, LuZap } from 'react-icons/lu'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { invalidateQueries } from '@/lib/react-query'
import { AIAgentAdvancedConfigDrawer } from '@/whitelabel/components/ai-agent/AIAgentAdvancedConfigDrawer'
import { ContextChange } from '@/whitelabel/components/ai-agent/ContextChange/ContextChange'
import { SafeMarkdown } from '@/whitelabel/components/ai-agent/SafeMarkdown/SafeMarkdown'
import { useAIAgent } from '@/whitelabel/hooks'
import { AIAgentPlaygroundPage } from '@/whitelabel/pages/AIAgentPlaygroundPage'
import { aiAgentService } from '@/whitelabel/services'
import { customerFacingAgentError } from '@/whitelabel/services/customer-agent-error'
import type { ConfiguratorBlock, ConfiguratorTurnMessage } from '@/whitelabel/types'

const UNAVAILABLE = 'O configurador não está disponível.'

type LiveActivity = { id: string; label: string; status: 'running' | 'done' }

function AIAgentConfiguratorPageBase() {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const showTest = searchParams.get('teste') === '1'
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const [messages, setMessages] = useState<ConfiguratorTurnMessage[]>([])
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LiveActivity[] | null>(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [saveOnSend, setSaveOnSend] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { data: agent } = useAIAgent(companyId, agentId)

  const title = messages.find((message) => message.role === 'USER')?.content || 'Configurar agente'

  const load = useCallback(async () => {
    if (!companyId || !agentId) return
    const response = await aiAgentService.listConfiguratorTurns(companyId, agentId)
    setMessages(response.data)
  }, [companyId, agentId])

  useEffect(() => {
    setReady(false)
    void load()
      .catch((error: AxiosError<{ message?: string }>) => {
        const message = error.response?.data?.message
        if (error.response?.status === 404 || message === UNAVAILABLE) {
          setUnavailable(true)
          return
        }
        setNotice('Não foi possível carregar a conversa.')
      })
      .finally(() => setReady(true))
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, notice, live])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async () => {
    if (!companyId || !agentId || text.trim() === '' || busy) return
    const content = text.trim()
    const controller = new AbortController()
    abortRef.current = controller
    setText('')
    setBusy(true)
    setNotice(null)
    setLive([])
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'USER', content, createdAt: new Date().toISOString() },
    ])
    try {
      await aiAgentService.streamConfiguratorTurn(companyId, agentId, content, {
        signal: controller.signal,
        forcePersist: saveOnSend,
        onActivity: (event) => {
          setLive((current) => {
            const list = current ?? []
            const index = list.findIndex((item) => item.id === event.id)
            if (index === -1) return [...list, event]
            const next = [...list]
            next[index] = event
            return next
          })
        },
        onDone: (blocks) => {
          const gravou =
            blocks.some((block) => block.type === 'proposal' && block.status === 'accepted') ||
            blocks.some((block) => block.type === 'markdown' && block.content.includes('Gravei'))
          if (gravou && companyId && agentId) {
            void invalidateQueries.aiAgentDetail(companyId, agentId)
          }
          setMessages((current) => [
            ...current,
            {
              id: blocks.find((block) => block.type === 'proposal')?.messageId ?? `reply-${Date.now()}`,
              role: 'ASSISTANT',
              content: '',
              createdAt: new Date().toISOString(),
              blocks,
            },
          ])
        },
        onError: (message) => {
          if (message === UNAVAILABLE) setUnavailable(true)
          else setNotice(customerFacingAgentError(message))
        },
      })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : ''
      if (message === UNAVAILABLE) setUnavailable(true)
      else setNotice(customerFacingAgentError(message))
    } finally {
      if (!controller.signal.aborted) {
        setLive(null)
        setBusy(false)
      }
    }
  }

  const appendAssistantNote = (markdown: string) => {
    setMessages((current) => [
      ...current,
      {
        id: `note-${Date.now()}`,
        role: 'ASSISTANT',
        content: markdown,
        createdAt: new Date().toISOString(),
        blocks: [{ type: 'markdown', content: markdown }],
      },
    ])
  }

  const persistText = async (content: string, recordInChat: boolean) => {
    if (!companyId || !agentId || content.trim() === '' || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await aiAgentService.persistConfiguratorContext(
        companyId,
        agentId,
        content.trim(),
        recordInChat
      )
      if (response.data.contextChanged) {
        void invalidateQueries.aiAgentDetail(companyId, agentId)
      }
      if (recordInChat) appendAssistantNote(response.data.message)
      else setNotice(response.data.message.replace(/\*\*/g, ''))
    } catch {
      setNotice('Não foi possível gravar no agente.')
    } finally {
      setBusy(false)
    }
  }

  const reconcileHistory = async () => {
    if (!companyId || !agentId || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await aiAgentService.reconcileConfiguratorContext(companyId, agentId)
      if (response.data.contextChanged) {
        void invalidateQueries.aiAgentDetail(companyId, agentId)
        appendAssistantNote(
          '**Atualizei** o agente com o que estava no histórico do configurador e ainda não tinha sido gravado.'
        )
      } else {
        setNotice('Nada novo para recuperar do histórico desta conversa.')
      }
    } catch {
      setNotice('Não foi possível atualizar a partir do histórico.')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (messageId: string, action: 'accept' | 'reject') => {
    if (!companyId || !agentId) return
    setBusy(true)
    setNotice(null)
    try {
      const response =
        action === 'accept'
          ? await aiAgentService.acceptConfiguratorProposal(companyId, agentId, messageId)
          : await aiAgentService.rejectConfiguratorProposal(companyId, agentId, messageId)
      // Sem recarregar, a configuração avançada mostra o texto antigo e salvar ali desfaz o aceite.
      if (response.data.status === 'accepted') {
        void invalidateQueries.aiAgentDetail(companyId, agentId)
      }
      setMessages((current) =>
        current.map((message) => ({
          ...message,
          blocks: message.blocks?.map((block) =>
            block.type === 'proposal' && block.messageId === messageId
              ? {
                  ...block,
                  status:
                    response.data.status === 'accepted' || response.data.status === 'rejected'
                      ? response.data.status
                      : block.status,
                }
              : block
          ),
        }))
      )
      if (response.data.message) {
        setMessages((current) => [
          ...current,
          {
            id: `note-${Date.now()}`,
            role: 'ASSISTANT',
            content: response.data.message ?? '',
            createdAt: new Date().toISOString(),
            blocks: [{ type: 'markdown', content: response.data.message ?? '' }],
          },
        ])
      }
    } catch {
      setNotice(customerFacingAgentError(undefined))
    } finally {
      setBusy(false)
    }
  }

  const visibleLive =
    live == null ? null : live.length > 0 ? live : [{ id: 'wait', label: 'Analisando o pedido', status: 'running' as const }]

  return (
    <Flex
      direction="column"
      h={{ base: 'calc(100vh - 64px - 2rem)', md: 'calc(100vh - 64px - 3rem)' }}
      bg="bg"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="2xl"
      overflow="hidden"
    >
      <Flex
        align="center"
        justify="space-between"
        gap={3}
        px={5}
        h="64px"
        flexShrink={0}
        borderBottomWidth="1px"
        borderColor="border.muted"
      >
        <Text fontWeight="normal" truncate flex="1" minW={0}>
          {title}
        </Text>
        <HStack gap={3} flexShrink={0}>
          <Switch.Root
            checked={showTest}
            onCheckedChange={(details) => {
              const next = new URLSearchParams(searchParams)
              if (details.checked) next.set('teste', '1')
              else next.delete('teste')
              setSearchParams(next, { replace: true })
            }}
            size="sm"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
          <Text fontSize="sm">Testar</Text>
          <Button
            size="sm"
            variant="outline"
            borderRadius="lg"
            flexShrink={0}
            disabled={!agent || busy}
            onClick={() => void reconcileHistory()}
            title="Recupera instruções e propostas pendentes do histórico"
          >
            <HStack gap={1}>
              <LuRefreshCw />
              <Text>Atualizar do histórico</Text>
            </HStack>
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderRadius="lg"
            flexShrink={0}
            disabled={!agent}
            onClick={() => setIsAdvancedOpen(true)}
          >
            Configuração avançada
          </Button>
          <Button
            size="sm"
            variant="outline"
            borderRadius="lg"
            flexShrink={0}
            onClick={() => navigate(agentId ? `/whitelabel/ai-agent/${agentId}` : '/whitelabel/ai-agent')}
          >
            Conversas
          </Button>
        </HStack>
      </Flex>

      <Flex flex="1" minH={0}>
        <Flex
          direction="column"
          flex="1"
          minW={0}
          display={{ base: showTest ? 'none' : 'flex', md: 'flex' }}
        >

      <Stack flex="1" minH={0} overflowY="auto" gap={8} px={{ base: 4, md: 8 }} py={8}>
        {unavailable ? (
          <Text color="fg.muted">{UNAVAILABLE}</Text>
        ) : (
          messages.map((message) =>
            message.role === 'USER' ? (
              <Flex key={message.id} justify="flex-end" direction="column" align="flex-end" gap={1}>
                <Box maxW="32rem" bg="bg.muted" borderRadius="3xl" px={4} py={2}>
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                </Box>
                <Button
                  size="xs"
                  variant="ghost"
                  color="fg.muted"
                  disabled={busy}
                  onClick={() => void persistText(message.content, true)}
                >
                  <LuSave />
                  Salvar no agente
                </Button>
              </Flex>
            ) : (
              <AssistantMessage key={message.id}>
                <MessageBlocks
                  messageId={message.id}
                  blocks={message.blocks ?? [{ type: 'markdown', content: message.content }]}
                  busy={busy}
                  onDecide={(action) => {
                    const proposal = message.blocks?.find((block) => block.type === 'proposal')
                    if (proposal?.type === 'proposal') void decide(proposal.messageId, action)
                  }}
                />
              </AssistantMessage>
            )
          )
        )}
        {visibleLive && (
          <AssistantMessage>
            <Stack gap={2} aria-live="polite">
              {visibleLive.map((item) => (
                <ActivityLine key={item.id} label={item.label} status={item.status} />
              ))}
            </Stack>
          </AssistantMessage>
        )}
        {notice && <Text color="fg.muted">{notice}</Text>}
        <div ref={bottomRef} />
      </Stack>

      {!unavailable && (
        <Box
          as="form"
          px={{ base: 4, md: 6 }}
          pb={5}
          flexShrink={0}
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <Flex align="center" justify="space-between" gap={3} mb={2} px={1}>
            <Switch.Root
              checked={saveOnSend}
              onCheckedChange={(details) => setSaveOnSend(details.checked)}
              size="sm"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
            <Text fontSize="sm" color="fg.muted" flex="1">
              Salvar no agente ao enviar
            </Text>
            <Button
              type="button"
              size="sm"
              variant="subtle"
              borderRadius="full"
              disabled={!ready || busy || text.trim() === ''}
              onClick={() => void persistText(text, false)}
            >
              <LuSave />
              Salvar sem conversar
            </Button>
          </Flex>
          <Flex align="center" borderWidth="1px" borderColor="border.muted" borderRadius="full" pl={5} pr={2} py={1}>
            <Input
              value={text}
              placeholder="Escreva uma mensagem..."
              borderWidth="0"
              px={0}
              disabled={!ready}
              _focusVisible={{ outline: 'none', boxShadow: 'none' }}
              onChange={(event) => setText(event.target.value)}
            />
            <IconButton
              type="submit"
              aria-label="Enviar"
              size="sm"
              borderRadius="full"
              bg="gray.500"
              color="white"
              _hover={{ bg: 'gray.600' }}
              disabled={!ready || busy}
            >
              <LuSend />
            </IconButton>
          </Flex>
        </Box>
      )}
        </Flex>
        {showTest && (
          <Box
            flex={{ base: '1', md: '0 0 42%' }}
            minW={0}
            minH={0}
            borderLeftWidth={{ base: 0, md: '1px' }}
            borderColor="border.muted"
          >
            <AIAgentPlaygroundPage embedded />
          </Box>
        )}
      </Flex>
      {agent ? (
        <AIAgentAdvancedConfigDrawer
          agent={agent}
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
        />
      ) : null}
    </Flex>
  )
}

function AssistantMessage({ children }: { children: ReactNode }) {
  return (
    <Flex align="flex-start" gap={3} maxW="46rem">
      <Box color="orange.500" flexShrink={0} mt="1" aria-hidden>
        <LuZap size={18} />
      </Box>
      <Stack gap={3} flex="1" minW={0}>
        {children}
      </Stack>
    </Flex>
  )
}

function ActivityLine({ label, status }: { label: string; status: 'running' | 'done' }) {
  return (
    <Flex align="center" gap={2} color="fg.muted" fontSize="sm">
      {status === 'running' ? <Spinner size="xs" /> : <LuCheck size={14} />}
      <Text>{label}</Text>
    </Flex>
  )
}

function MessageBlocks({
  messageId,
  blocks,
  busy,
  onDecide,
}: {
  messageId: string
  blocks: ConfiguratorBlock[]
  busy: boolean
  onDecide: (action: 'accept' | 'reject') => void
}) {
  return (
    <Stack gap={3}>
      {blocks.map((block, index) => {
        if (block.type === 'activity') {
          return <ActivityLine key={`${messageId}-activity-${index}`} label={block.label} status="done" />
        }
        if (block.type === 'markdown') {
          return <SafeMarkdown key={`${messageId}-md-${index}`} source={block.content} />
        }
        return (
          <Box key={`${messageId}-proposal`} borderWidth="1px" borderColor="border.muted" borderRadius="xl" p={4}>
            <SafeMarkdown source={block.behavior} />
            <Stack gap={3} mt={3}>
              {block.changes?.map((change, changeIndex) => (
                <ContextChange key={changeIndex} before={change.before} after={change.after} />
              ))}
            </Stack>
            {block.status === 'pending' ? (
              <Box mt={3}>
                <Text mb={2} fontSize="sm" color="fg.muted">
                  Ainda não foi gravado. Confira e toque em Aceitar.
                </Text>
                <Flex gap={2}>
                  <Button size="sm" disabled={busy} onClick={() => onDecide('accept')}>
                    Aceitar
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide('reject')}>
                    Recusar
                  </Button>
                </Flex>
              </Box>
            ) : (
              <Text mt={3} fontSize="sm" color="fg.muted">
                {block.status === 'accepted' ? 'Alteração gravada.' : 'Alteração recusada.'}
              </Text>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}

const AIAgentConfiguratorPage = memo(AIAgentConfiguratorPageBase)

export { AIAgentConfiguratorPage }
