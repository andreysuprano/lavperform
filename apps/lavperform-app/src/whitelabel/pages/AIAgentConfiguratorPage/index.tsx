import { Box, Button, Flex, IconButton, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LuCheck, LuSend, LuZap } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { SafeMarkdown } from '@/whitelabel/components/ai-agent/SafeMarkdown/SafeMarkdown'
import { aiAgentService } from '@/whitelabel/services'
import type { ConfiguratorBlock, ConfiguratorTurnMessage } from '@/whitelabel/types'

const FAILED = 'A resposta falhou.'
const UNAVAILABLE = 'O configurador não está disponível.'

type LiveActivity = { id: string; label: string; status: 'running' | 'done' }

function AIAgentConfiguratorPageBase() {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const [messages, setMessages] = useState<ConfiguratorTurnMessage[]>([])
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState<LiveActivity[] | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
          else setNotice(message || FAILED)
        },
      })
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : FAILED
      if (message === UNAVAILABLE) setUnavailable(true)
      else setNotice(message || FAILED)
    } finally {
      if (!controller.signal.aborted) {
        setLive(null)
        setBusy(false)
      }
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
      setNotice(FAILED)
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
        <Button
          size="sm"
          variant="outline"
          borderRadius="lg"
          flexShrink={0}
          onClick={() => navigate(agentId ? `/whitelabel/ai-agent/${agentId}` : '/whitelabel/ai-agent')}
        >
          Conversas
        </Button>
      </Flex>

      <Stack flex="1" minH={0} overflowY="auto" gap={8} px={{ base: 4, md: 8 }} py={8}>
        {unavailable ? (
          <Text color="fg.muted">{UNAVAILABLE}</Text>
        ) : (
          messages.map((message) =>
            message.role === 'USER' ? (
              <Flex key={message.id} justify="flex-end">
                <Box maxW="32rem" bg="bg.muted" borderRadius="3xl" px={4} py={2}>
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                </Box>
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
            {block.status === 'pending' ? (
              <Flex gap={2} mt={3}>
                <Button size="sm" disabled={busy} onClick={() => onDecide('accept')}>
                  Aceitar
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onDecide('reject')}>
                  Recusar
                </Button>
              </Flex>
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
