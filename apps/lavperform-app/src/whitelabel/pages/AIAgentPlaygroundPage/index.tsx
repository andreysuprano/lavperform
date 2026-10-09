import { Box, Button, Flex, IconButton, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { LuSend, LuZap } from 'react-icons/lu'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { SafeMarkdown } from '@/whitelabel/components/ai-agent/SafeMarkdown/SafeMarkdown'
import { aiAgentService } from '@/whitelabel/services'

const FAILED = 'A resposta falhou.'
const UNAVAILABLE = 'O teste não está disponível.'

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

function AIAgentPlaygroundPageBase({ embedded = false }: { embedded?: boolean }) {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const [sessionId] = useState(() => crypto.randomUUID())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, notice, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = async () => {
    const content = text.trim()
    if (!companyId || !agentId || content === '' || busy || unavailable) return
    const history = messages.map((message) => ({ role: message.role, content: message.content }))
    const controller = new AbortController()
    abortRef.current = controller
    setText('')
    setBusy(true)
    setNotice(null)
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: 'user', content }])
    try {
      const response = await aiAgentService.sendPlaygroundTurn(
        companyId,
        agentId,
        { sessionId, content, history },
        controller.signal
      )
      if (controller.signal.aborted) return
      setMessages((current) => [
        ...current,
        { id: `reply-${Date.now()}`, role: 'assistant', content: response.data.content },
      ])
    } catch (error) {
      if (controller.signal.aborted) return
      const axiosError = error as AxiosError<{ message?: string }>
      const message = axiosError.response?.data?.message
      if (axiosError.response?.status === 404 || message === UNAVAILABLE) {
        setUnavailable(true)
        return
      }
      setNotice(typeof message === 'string' && message.trim() ? message : FAILED)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <Flex
      direction="column"
      h={embedded ? '100%' : { base: 'calc(100vh - 64px - 2rem)', md: 'calc(100vh - 64px - 3rem)' }}
      minH={0}
      bg="bg"
      borderWidth={embedded ? 0 : '1px'}
      borderColor="border.muted"
      borderRadius={embedded ? 0 : '2xl'}
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
          Testar agente
        </Text>
        {!embedded && (
          <Button
            size="sm"
            variant="outline"
            borderRadius="lg"
            flexShrink={0}
            onClick={() => navigate(agentId ? `/whitelabel/ai-agent/${agentId}` : '/whitelabel/ai-agent')}
          >
            Conversas
          </Button>
        )}
      </Flex>

      <Stack flex="1" minH={0} overflowY="auto" gap={8} px={{ base: 4, md: 8 }} py={8}>
        {unavailable ? (
          <Text color="fg.muted">{UNAVAILABLE}</Text>
        ) : (
          messages.map((message) =>
            message.role === 'user' ? (
              <Flex key={message.id} justify="flex-end">
                <Box maxW="32rem" bg="bg.muted" borderRadius="3xl" px={4} py={2}>
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                </Box>
              </Flex>
            ) : (
              <AssistantMessage key={message.id}>
                <SafeMarkdown source={message.content} />
              </AssistantMessage>
            )
          )
        )}
        {busy && (
          <AssistantMessage>
            <Flex align="center" gap={2} color="fg.muted" fontSize="sm" aria-live="polite">
              <Spinner size="xs" />
              <Text>Respondendo</Text>
            </Flex>
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
              disabled={busy || !companyId}
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
              disabled={busy || !companyId || text.trim() === ''}
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

const AIAgentPlaygroundPage = memo(AIAgentPlaygroundPageBase)

export { AIAgentPlaygroundPage }
