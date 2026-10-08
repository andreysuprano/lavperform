import { Box, Button, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { LuBot } from 'react-icons/lu'
import { RiArrowLeftLine } from 'react-icons/ri'
import { useNavigate, useParams } from 'react-router-dom'

import { AppContentLayout } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { SafeMarkdown } from '@/whitelabel/components/ai-agent/SafeMarkdown/SafeMarkdown'
import { aiAgentService } from '@/whitelabel/services'
import type { ConfiguratorTurnMessage } from '@/whitelabel/types'

const FAILED = 'A resposta falhou.'
const UNAVAILABLE = 'O configurador não está disponível.'

function AIAgentConfiguratorPageBase() {
  const { agentId = '' } = useParams()
  const navigate = useNavigate()
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const [messages, setMessages] = useState<ConfiguratorTurnMessage[]>([])
  const [text, setText] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!companyId || !agentId) return
    const response = await aiAgentService.listConfiguratorTurns(companyId, agentId)
    setMessages(response.data)
  }, [companyId, agentId])

  useEffect(() => {
    void load().catch((error: AxiosError<{ message?: string }>) => {
      const message = error.response?.data?.message
      if (error.response?.status === 404 || message === UNAVAILABLE) {
        setUnavailable(true)
        return
      }
      setNotice('Não foi possível carregar a conversa.')
    })
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, notice])

  const send = async () => {
    if (!companyId || !agentId || text.trim() === '' || busy) return
    const content = text.trim()
    setText('')
    setBusy(true)
    setNotice(null)
    setMessages((current) => [
      ...current,
      { id: `local-${Date.now()}`, role: 'USER', content, createdAt: new Date().toISOString() },
    ])
    try {
      const response = await aiAgentService.sendConfiguratorTurn(companyId, agentId, content)
      setMessages((current) => [
        ...current,
        {
          id: response.data.blocks.find((block) => block.type === 'proposal')?.messageId
            ?? `reply-${Date.now()}`,
          role: 'ASSISTANT',
          content: '',
          createdAt: new Date().toISOString(),
          blocks: response.data.blocks,
        },
      ])
    } catch {
      setNotice(FAILED)
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

  return (
    <AppContentLayout icon={<LuBot />} title="Configurar agente">
      <Button
        size="xs"
        variant="ghost"
        alignSelf="flex-start"
        onClick={() => navigate(agentId ? `/whitelabel/ai-agent/${agentId}` : '/whitelabel/ai-agent')}
      >
        <RiArrowLeftLine />
        Voltar
      </Button>
      {unavailable ? (
        <Text>{UNAVAILABLE}</Text>
      ) : (
        <Flex direction="column" flex="1" minH="70vh">
          <Stack gap={4} flex="1" overflowY="auto" pb={4}>
            {messages.map((message) => (
              <Box
                key={message.id}
                alignSelf={message.role === 'USER' ? 'flex-end' : 'flex-start'}
                maxW="40rem"
                bg={message.role === 'USER' ? 'bg.muted' : 'transparent'}
                borderRadius="lg"
                px={message.role === 'USER' ? 4 : 0}
                py={2}
              >
                {message.role === 'USER' ? (
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                ) : (
                  <Stack gap={3}>
                    {(message.blocks ?? [{ type: 'markdown' as const, content: message.content }]).map(
                      (block, blockIndex) =>
                        block.type === 'markdown' ? (
                          <SafeMarkdown key={`${message.id}-md-${blockIndex}`} source={block.content} />
                        ) : (
                          <Box key={`${message.id}-proposal`} borderWidth="1px" borderRadius="lg" p={4}>
                            <SafeMarkdown source={block.behavior} />
                            {block.status === 'pending' ? (
                              <Flex gap={2} mt={3}>
                                <Button size="sm" disabled={busy} onClick={() => void decide(block.messageId, 'accept')}>
                                  Aceitar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void decide(block.messageId, 'reject')}
                                >
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
                    )}
                  </Stack>
                )}
              </Box>
            ))}
            {notice && <Text color="fg.muted">{notice}</Text>}
            <div ref={bottomRef} />
          </Stack>
          <Flex gap={2} pt={3}>
            <Input
              value={text}
              placeholder="Descreva o que o agente deve fazer"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
            />
            <Button disabled={busy || text.trim() === ''} onClick={() => void send()}>
              Enviar
            </Button>
          </Flex>
        </Flex>
      )}
    </AppContentLayout>
  )
}

const AIAgentConfiguratorPage = memo(AIAgentConfiguratorPageBase)

export { AIAgentConfiguratorPage }
