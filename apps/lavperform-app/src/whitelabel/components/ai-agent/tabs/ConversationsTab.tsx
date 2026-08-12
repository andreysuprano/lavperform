import {
  Badge,
  Box,
  Card,
  Circle,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  Stack,
  Text,
} from '@chakra-ui/react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { LuMessageSquare, LuUser } from 'react-icons/lu'
import { RiRobot2Line, RiSearchLine } from 'react-icons/ri'

import { Empty, LoadingState } from '@/components'
import { useColorMode } from '@/components/ui/color-mode'
import { formatTelefone } from '@/utils/mask'
import {
  useAIAgentConversationMessages,
  useAIAgentConversations,
} from '@/whitelabel/hooks'
import type {
  AIAgent,
  AIAgentConversationMessage,
  AIAgentConversationSummary,
} from '@/whitelabel/types'

const originalTypeLabels: Record<string, string> = {
  AUDIO: 'Áudio',
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return formatTime(iso)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

function dateLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

function getDisplayName(conversation: AIAgentConversationSummary): string {
  return (
    conversation.groupName ||
    conversation.userName ||
    conversation.userPhone ||
    'Sem nome'
  )
}

interface ConversationListItemProps {
  conversation: AIAgentConversationSummary
  selected: boolean
  onSelect: (id: string) => void
}

function ConversationListItem({
  conversation,
  selected,
  onSelect,
}: ConversationListItemProps) {
  const displayName = getDisplayName(conversation)
  const preview = conversation.lastMessage
    ? `${conversation.lastMessage.role === 'ASSISTANT' ? 'Agente: ' : ''}${
        conversation.lastMessage.content
      }`
    : 'Sem mensagens'

  return (
    <Box
      as="button"
      onClick={() => onSelect(conversation.id)}
      w="full"
      textAlign="left"
      px={3}
      py={3.5}
      borderRadius="md"
      bg={selected ? 'primary.50' : 'transparent'}
      borderWidth="1px"
      borderColor={selected ? 'primary.300' : 'transparent'}
      _hover={{ bg: selected ? 'primary.50' : 'bg.muted' }}
      transition="background 0.15s"
    >
      <HStack gap={3} align="flex-start">
        <Circle
          size={10}
          bg={selected ? 'primary.500' : 'bg.muted'}
          color={selected ? 'primary.contrast' : 'fg.muted'}
          flexShrink={0}
        >
          <Text fontSize="xs" fontWeight="bold">
            {getInitials(displayName)}
          </Text>
        </Circle>
        <Stack gap={1} flex={1} minW={0}>
          <HStack justify="space-between" gap={2} align="flex-start">
            <Text
              fontSize="sm"
              fontWeight="semibold"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {displayName}
            </Text>
            <Text fontSize="2xs" color="fg.muted" flexShrink={0} pt={0.5}>
              {formatRelativeDay(conversation.updatedAt)}
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted">
            {formatTelefone(conversation.userPhone) || conversation.userPhone}
          </Text>
          <Text
            fontSize="xs"
            color="fg.muted"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {preview}
          </Text>
        </Stack>
      </HStack>
    </Box>
  )
}

interface MessageBubbleProps {
  message: AIAgentConversationMessage
}

function MessageBubble({ message }: MessageBubbleProps) {
  const { colorMode } = useColorMode()
  const isAgent = message.role === 'ASSISTANT'
  const typeLabel =
    message.originalType && message.originalType !== 'TEXT'
      ? originalTypeLabels[message.originalType]
      : undefined

  return (
    <Flex justify={isAgent ? 'flex-end' : 'flex-start'} w="full">
      <Stack
        gap={1.5}
        maxW={{ base: '92%', md: '80%' }}
        bg={isAgent ? 'primary.50' : 'bg.muted'}
        borderWidth="1px"
        borderColor={isAgent ? 'primary.200' : 'transparent'}
        color="fg"
        px={4}
        py={3}
        borderRadius="lg"
        borderBottomRightRadius={isAgent ? 'sm' : 'lg'}
        borderBottomLeftRadius={isAgent ? 'lg' : 'sm'}
      >
        <HStack justify="space-between" gap={3}>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color={isAgent ? 'primary.700' : 'fg.muted'}
          >
            {isAgent ? 'Agente' : 'Cliente'}
          </Text>
          {typeLabel && (
            <Badge size="sm" variant="subtle" colorPalette="gray">
              {typeLabel}
            </Badge>
          )}
        </HStack>

        {isAgent ? (
          <Box
            data-color-mode={colorMode}
            css={{
              '& .wmde-markdown': {
                background: 'transparent',
                fontSize: '0.875rem',
                color: 'inherit',
              },
              '& .wmde-markdown p': { mb: '0.4em' },
              '& .wmde-markdown p:last-child': { mb: 0 },
            }}
          >
            <MDEditor.Markdown source={message.content || ''} />
          </Box>
        ) : (
          <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
            {message.content}
          </Text>
        )}

        <Text fontSize="2xs" color="fg.muted" alignSelf="flex-end">
          {isAgent
            ? formatDateTime(message.createdAt)
            : formatTime(message.createdAt)}
        </Text>
      </Stack>
    </Flex>
  )
}

interface ConversationsTabProps {
  agent: AIAgent
}

function ConversationsTabBase({ agent }: ConversationsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    isError: isConversationsError,
  } = useAIAgentConversations(agent.id, { search: debouncedSearch })

  const conversations = useMemo(
    () => conversationsData?.data ?? [],
    [conversationsData]
  )

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedId(undefined)
      return
    }
    if (
      !selectedId ||
      !conversations.some((conversation) => conversation.id === selectedId)
    ) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  const {
    data: messages,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useAIAgentConversationMessages(agent.id, selectedId)

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  const threadItems = useMemo(() => {
    if (!messages) return []
    const items: Array<
      | { type: 'date'; key: string; label: string }
      | { type: 'message'; message: AIAgentConversationMessage }
    > = []
    let lastDay = ''
    for (const message of messages) {
      const day = new Date(message.createdAt).toDateString()
      if (day !== lastDay) {
        items.push({
          type: 'date',
          key: day,
          label: dateLabel(message.createdAt),
        })
        lastDay = day
      }
      items.push({ type: 'message', message })
    }
    return items
  }, [messages])

  useEffect(() => {
    const node = threadRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages])

  const hasSearch = debouncedSearch.length > 0
  const showEmptySearch =
    !isLoadingConversations &&
    !isConversationsError &&
    conversations.length === 0 &&
    hasSearch
  const showEmptyAll =
    !isLoadingConversations &&
    !isConversationsError &&
    conversations.length === 0 &&
    !hasSearch

  return (
    <Card.Root variant="outline">
      <Card.Header pb={3}>
        <Card.Title>Conversas</Card.Title>
        <Card.Description>
          Veja as conversas dos seus clientes com o agente, agrupadas por
          pessoa.
        </Card.Description>
      </Card.Header>
      <Card.Body pt={0} px={0} pb={0}>
        {isLoadingConversations && !hasSearch ? (
          <Box px={6} py={8}>
            <LoadingState title="Carregando conversas..." />
          </Box>
        ) : isConversationsError ? (
          <Box px={6} py={8}>
            <Empty
              title="Erro ao carregar conversas"
              description="Não foi possível carregar as conversas. Tente novamente."
            />
          </Box>
        ) : showEmptyAll ? (
          <Box px={6} py={8}>
            <Empty
              title="Nenhuma conversa ainda"
              description="Quando seus clientes conversarem com o agente, as conversas aparecerão aqui."
            />
          </Box>
        ) : (
          <Flex
            direction={{ base: 'column', md: 'row' }}
            h={{ base: 'auto', md: '640px' }}
            borderTopWidth="1px"
            borderColor="border"
          >
            <Flex
              direction="column"
              w={{ base: 'full', md: '360px' }}
              flexShrink={0}
              borderRightWidth={{ base: 0, md: '1px' }}
              borderBottomWidth={{ base: '1px', md: 0 }}
              borderColor="border"
            >
              <Box px={3} py={3} borderBottomWidth="1px" borderColor="border">
                <InputGroup startElement={<Icon as={RiSearchLine} />}>
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    size="sm"
                  />
                </InputGroup>
              </Box>

              <Stack
                gap={1}
                overflowY="auto"
                flex={1}
                p={2}
                maxH={{ base: '280px', md: 'none' }}
              >
                {isLoadingConversations ? (
                  <Box py={6}>
                    <LoadingState title="Buscando..." />
                  </Box>
                ) : showEmptySearch ? (
                  <Empty
                    title="Nenhum contato encontrado"
                    description="Tente buscar por outro nome ou telefone."
                  />
                ) : (
                  conversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation}
                      selected={conversation.id === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))
                )}
              </Stack>
            </Flex>

            <Flex direction="column" flex={1} minW={0} minH={{ base: '360px', md: 0 }}>
              {selectedConversation ? (
                <HStack
                  gap={3}
                  px={5}
                  py={3.5}
                  borderBottomWidth="1px"
                  borderColor="border"
                  bg="bg.muted"
                >
                  <Circle size={9} bg="primary.500" color="primary.contrast">
                    <Icon as={LuUser} boxSize={4} />
                  </Circle>
                  <Stack gap={0} flex={1} minW={0}>
                    <HStack gap={2}>
                      <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
                        {getDisplayName(selectedConversation)}
                      </Text>
                      {selectedConversation.isGroup && (
                        <Badge size="sm" variant="subtle">
                          Grupo
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="fg.muted">
                      {formatTelefone(selectedConversation.userPhone) ||
                        selectedConversation.userPhone}
                    </Text>
                  </Stack>
                </HStack>
              ) : (
                <HStack
                  px={5}
                  py={3.5}
                  borderBottomWidth="1px"
                  borderColor="border"
                  bg="bg.muted"
                >
                  <Text fontSize="sm" color="fg.muted">
                    Selecione uma conversa
                  </Text>
                </HStack>
              )}

              <Box ref={threadRef} flex={1} overflowY="auto" px={5} py={5}>
                {!selectedId ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    h="full"
                    color="fg.muted"
                    gap={2}
                  >
                    <Icon as={LuMessageSquare} boxSize={8} />
                    <Text fontSize="sm">Selecione uma conversa</Text>
                  </Flex>
                ) : isLoadingMessages ? (
                  <LoadingState title="Carregando mensagens..." />
                ) : isMessagesError ? (
                  <Empty
                    title="Erro ao carregar mensagens"
                    description="Não foi possível carregar as mensagens desta conversa."
                  />
                ) : !messages || messages.length === 0 ? (
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    h="full"
                    color="fg.muted"
                    gap={2}
                  >
                    <Icon as={RiRobot2Line} boxSize={8} />
                    <Text fontSize="sm">Nenhuma mensagem nesta conversa</Text>
                  </Flex>
                ) : (
                  <Stack gap={4}>
                    {threadItems.map((item) =>
                      item.type === 'date' ? (
                        <Flex key={item.key} justify="center">
                          <Badge variant="subtle" size="sm">
                            {item.label}
                          </Badge>
                        </Flex>
                      ) : (
                        <MessageBubble
                          key={item.message.id}
                          message={item.message}
                        />
                      )
                    )}
                  </Stack>
                )}
              </Box>
            </Flex>
          </Flex>
        )}
      </Card.Body>
    </Card.Root>
  )
}

const ConversationsTab = memo(ConversationsTabBase) as typeof ConversationsTabBase

export { ConversationsTab }
