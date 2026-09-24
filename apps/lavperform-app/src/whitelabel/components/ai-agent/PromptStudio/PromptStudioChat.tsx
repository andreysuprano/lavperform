import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useEffect, useMemo, useState } from 'react'

import {
  useDiscardPromptStudioProposal,
  usePromptStudioThread,
  useSendPromptStudioMessage,
} from '@/whitelabel/hooks'
import type {
  PromptDocument,
  PromptProposal,
  PromptStudioMessage,
} from '@/whitelabel/types'

const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.'

function parseProposal(message: PromptStudioMessage): PromptProposal | null {
  if (!message.proposalJson) return null
  try {
    return JSON.parse(message.proposalJson) as PromptProposal
  } catch {
    return null
  }
}

function formatSeedContent(payload: {
  question: string
  answer: string
  whatWasWrong: string
}) {
  return [
    `Pergunta: ${payload.question}`,
    `Resposta: ${payload.answer}`,
    `O que estava errado: ${payload.whatWasWrong}`,
  ].join('\n\n')
}

interface PromptStudioChatProps {
  agentId: string
  document: PromptDocument
  seed?: {
    question: string
    answer: string
    whatWasWrong: string
  } | null
  onSeedConsumed?: () => void
  onAcceptProposal: (proposal: PromptProposal) => Promise<void>
  errorMessage?: string | null
}

function PromptStudioChatBase({
  agentId,
  document,
  seed = null,
  onSeedConsumed,
  onAcceptProposal,
  errorMessage = null,
}: PromptStudioChatProps) {
  const threadQuery = usePromptStudioThread(agentId)
  const sendMessage = useSendPromptStudioMessage()
  const discardProposal = useDiscardPromptStudioProposal()

  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [localProposal, setLocalProposal] = useState<PromptProposal | null>(
    null
  )
  const [isAccepting, setIsAccepting] = useState(false)

  const messages = threadQuery.data?.messages ?? []

  const proposalFromThread = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const parsed = parseProposal(messages[i])
      if (parsed) return parsed
    }
    return null
  }, [messages])

  const proposal = localProposal ?? proposalFromThread

  useEffect(() => {
    if (!seed) return

    let cancelled = false

    const run = async () => {
      setLocalError(null)
      try {
        const result = await sendMessage.mutateAsync({
          agentId,
          content: formatSeedContent(seed),
          document,
        })
        if (cancelled) return
        setLocalProposal(result.proposal)
        onSeedConsumed?.()
      } catch (error) {
        if (cancelled) return
        const status =
          error instanceof AxiosError ? error.response?.status : undefined
        const message =
          error instanceof AxiosError
            ? (error.response?.data as { message?: string })?.message
            : undefined
        setLocalError(
          status === 409 || message === STALE_MESSAGE
            ? STALE_MESSAGE
            : message || 'Não foi possível enviar a mensagem. Tente de novo.'
        )
        onSeedConsumed?.()
      }
    }

    void run()

    return () => {
      cancelled = true
    }
    // Seed dispara um envio único; sendMessage/document mudam a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, agentId])

  const handleSend = async () => {
    const content = draft.trim()
    if (!content) return

    setLocalError(null)
    try {
      const result = await sendMessage.mutateAsync({
        agentId,
        content,
        document,
      })
      setLocalProposal(result.proposal)
      setDraft('')
    } catch (error) {
      const status =
        error instanceof AxiosError ? error.response?.status : undefined
      const message =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string })?.message
          : undefined
      setLocalError(
        status === 409 || message === STALE_MESSAGE
          ? STALE_MESSAGE
          : message || 'Não foi possível enviar a mensagem. Tente de novo.'
      )
    }
  }

  const handleAccept = async () => {
    if (!proposal) return
    setIsAccepting(true)
    setLocalError(null)
    try {
      await onAcceptProposal(proposal)
      setLocalProposal(null)
    } catch (error) {
      const status =
        error instanceof AxiosError ? error.response?.status : undefined
      const apiMessage =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string })?.message
          : undefined
      const message = error instanceof Error ? error.message : undefined
      if (
        status === 409 ||
        apiMessage === STALE_MESSAGE ||
        message === STALE_MESSAGE
      ) {
        setLocalError(STALE_MESSAGE)
      }
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDiscard = async () => {
    setLocalError(null)
    await discardProposal.mutateAsync({ agentId })
    setLocalProposal(null)
  }

  const displayError = localError || errorMessage

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Text fontWeight="semibold" fontSize="sm">
          Chat especialista
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Ajuste o prompt com base no teste. Aceitar grava só o que foi
          proposto.
        </Text>
      </Stack>

      <Stack
        gap={3}
        maxH="320px"
        overflowY="auto"
        borderWidth="1px"
        borderRadius="md"
        p={3}
      >
        {threadQuery.isLoading ? (
          <Text fontSize="sm" color="fg.muted">
            Carregando mensagens...
          </Text>
        ) : messages.length === 0 ? (
          <Text fontSize="sm" color="fg.muted">
            Nenhuma mensagem ainda.
          </Text>
        ) : (
          messages.map((message, index) => (
            <Box
              key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
              alignSelf={message.role === 'USER' ? 'flex-end' : 'flex-start'}
              maxW="90%"
              bg={message.role === 'USER' ? 'bg.emphasized' : 'bg.subtle'}
              borderRadius="md"
              px={3}
              py={2}
            >
              <Text fontSize="xs" color="fg.muted" mb={1}>
                {message.role === 'USER' ? 'Você' : 'Especialista'}
              </Text>
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {message.content}
              </Text>
            </Box>
          ))
        )}
      </Stack>

      {displayError ? (
        <Text fontSize="sm" color="fg.error">
          {displayError}
        </Text>
      ) : null}

      {proposal ? (
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Stack gap={3}>
            <Text fontWeight="semibold" fontSize="sm">
              Proposta de correção
            </Text>
            <Text fontSize="sm">{proposal.summary}</Text>
            {Object.entries(proposal.changes).map(([key, value]) =>
              value ? (
                <Stack key={key} gap={1}>
                  <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                    {key}
                  </Text>
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {value}
                  </Text>
                </Stack>
              ) : null
            )}
            <HStack>
              <Button
                size="sm"
                loading={isAccepting}
                onClick={() => void handleAccept()}
              >
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={discardProposal.isPending}
                onClick={() => void handleDiscard()}
              >
                Descartar
              </Button>
            </HStack>
          </Stack>
        </Box>
      ) : null}

      <Stack gap={2}>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva o que precisa mudar no prompt..."
          rows={3}
        />
        <Button
          size="sm"
          alignSelf="flex-start"
          loading={sendMessage.isPending}
          disabled={!draft.trim()}
          onClick={() => void handleSend()}
        >
          Enviar
        </Button>
      </Stack>
    </Stack>
  )
}

const PromptStudioChat = memo(PromptStudioChatBase) as typeof PromptStudioChatBase

export { PromptStudioChat, type PromptStudioChatProps }
