import {
  Badge,
  Box,
  Card,
  Circle,
  Flex,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect, useMemo, useState } from 'react'
import { LuMessageSquare, LuUser } from 'react-icons/lu'
import { RiRobot2Line } from 'react-icons/ri'

import { Empty, LoadingState } from '@/components'
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

function formatRelativeDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const isSameDay = date.toDateString() === today.toDateString()
  if (isSameDay) return formatTime(iso)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
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
  const displayName =
    conversation.groupName ||
    conversation.userName ||
    conversation.userPhone ||
    'Sem nome'

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
      py={3}
      borderRadius="md"
      bg={selected ? 'primary.50' : 'transparent'}
      borderWidth="1px"
      borderColor={selected ? 'primary.300' : 'transparent'}
      _hover={{ bg: selected ? 'primary.50' : 'bg.muted' }}
      transition="background 0.15s"
    >
      <HStack gap={3} align="flex-start">
        <Circle size={9} bg="primary.500" color="primary.contrast" flexShrink={0}>
          <Text fontSize="xs" fontWeight="bold">
            {getInitials(displayName)}
          </Text>
        </Circle>
        <Stack gap={0.5} flex={1} minW={0}>
          <HStack justify="space-between" gap={2}>
            <Text
              fontSize="sm"
              fontWeight="semibold"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {displayName}
            </Text>
            <Text fontSize="2xs" color="fg.muted" flexShrink={0}>
              {formatRelativeDay(conversation.updatedAt)}
            </Text>
          </HStack>
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
  const isAgent = message.role === 'ASSISTANT'
  const typeLabel =
    message.originalType && message.originalType !== 'TEXT'
      ? originalTypeLabels[message.originalType]
      : undefined

  return (
    <Flex justify={isAgent ? 'flex-end' : 'flex-start'} w="full">
      <Stack
        gap={1}
        maxW={{ base: '85%', md: '70%' }}
        bg={isAgent ? 'primary.500' : 'bg.muted'}
        color={isAgent ? 'primary.contrast' : 'fg'}
        px={3}
        py={2}
        borderRadius="lg"
        borderBottomRightRadius={isAgent ? 'sm' : 'lg'}
        borderBottomLeftRadius={isAgent ? 'lg' : 'sm'}
      >
        {typeLabel && (
          <Badge
            size="sm"
            variant="solid"
            colorPalette={isAgent ? 'blackAlpha' : 'gray'}
            alignSelf="flex-start"
          >
            {typeLabel}
          </Badge>
        )}
        <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
          {message.content}
        </Text>
        <Text
          fontSize="2xs"
          color={isAgent ? 'whiteAlpha.800' : 'fg.muted'}
          alignSelf="flex-end"
        >
          {formatTime(message.createdAt)}
        </Text>
      </Stack>
    </Flex>
  )
}

interface ConversationsTabProps {
  agent: AIAgent
}

function ConversationsTabBase({ agent }: ConversationsTabProps) {
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    isError: isConversationsError,
  } = useAIAgentConversations(agent.id)

  const conversations = useMemo(
    () => conversationsData?.data ?? [],
    [conversationsData]
  )

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id)
    }
  }, [conversations, selectedId])

  const {
    data: messages,
    isLoading: isLoadingMessages,
    isError: isMessagesError,
  } = useAIAgentConversationMessages(agent.id, selectedId)

  const selectedConversation = conversations.find((c) => c.id === selectedId)

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>Conversas</Card.Title>
        <Card.Description>
          Veja as conversas dos seus clientes com o agente, agrupadas por
          pessoa.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        {isLoadingConversations ? (
          <LoadingState title="Carregando conversas..." />
        ) : isConversationsError ? (
          <Empty
            title="Erro ao carregar conversas"
            description="Não foi possível carregar as conversas. Tente novamente."
          />
        ) : conversations.length === 0 ? (
          <Empty
            title="Nenhuma conversa ainda"
            description="Quando seus clientes conversarem com o agente, as conversas aparecerão aqui."
          />
        ) : (
          <Flex
            direction={{ base: 'column', md: 'row' }}
            gap={4}
            h={{ base: 'auto', md: '600px' }}
          >
            {/* Lista de clientes */}
            <Stack
              gap={1}
              w={{ base: 'full', md: '320px' }}
              flexShrink={0}
              overflowY="auto"
              maxH={{ base: '260px', md: 'full' }}
              pr={1}
            >
              {conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}
            </Stack>

            {/* Chat */}
            <Flex
              direction="column"
              flex={1}
              minW={0}
              borderWidth="1px"
              borderColor="border"
              borderRadius="md"
              overflow="hidden"
            >
              {selectedConversation && (
                <HStack
                  gap={3}
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="border"
                  bg="bg.muted"
                >
                  <Circle size={8} bg="primary.500" color="primary.contrast">
                    <Icon as={LuUser} boxSize={4} />
                  </Circle>
                  <Stack gap={0}>
                    <Text fontSize="sm" fontWeight="semibold">
                      {selectedConversation.groupName ||
                        selectedConversation.userName ||
                        'Sem nome'}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {selectedConversation.userPhone}
                    </Text>
                  </Stack>
                </HStack>
              )}

              <Box flex={1} overflowY="auto" px={4} py={4} minH="300px">
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
                  <Stack gap={3}>
                    {messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
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
