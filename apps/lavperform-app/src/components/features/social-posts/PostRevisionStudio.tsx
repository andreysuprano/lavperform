import {
  Box,
  Button,
  Flex,
  HStack,
  Menu,
  Portal,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import {
  LuCopy,
  LuDownload,
  LuEllipsis,
  LuEye,
  LuPencil,
  LuRefreshCw,
  LuSend,
  LuSparkles,
  LuTriangleAlert,
  LuUndo2,
} from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import { useColorModeValue } from '@/components/ui/color-mode'
import type {
  BrandIdentity,
  PostVariation,
  PostVersion,
  SocialPostDraft,
} from '@/types'

import { PostArtwork } from './PostArtwork'

const SUGGESTIONS = [
  'Fundo mais claro',
  'Trocar título',
  'Legenda mais curta',
  'Mais promocional',
  'Destacar preço',
]

interface Props {
  draft: SocialPostDraft
  brand: Pick<
    BrandIdentity,
    'logoLightUrl' | 'logoDarkUrl' | 'titleFont' | 'bodyFont'
  >
  pending?: boolean
  error?: string | null
  onRevise: (variationId: string, prompt: string) => void
  onSelectVariation: (variationId: string) => void
  onSelectVersion: (variationId: string, versionId: string) => void
  onRestoreVersion: (variationId: string, versionId: string) => void
  onRetry: () => void
  onDownload: (variation: PostVariation, version: PostVersion) => void
  onCopy: (version: PostVersion) => void
}

export function PostRevisionStudio({
  draft,
  brand,
  pending,
  error,
  onRevise,
  onSelectVariation,
  onSelectVersion,
  onRestoreVersion,
  onRetry,
  onDownload,
  onCopy,
}: Props) {
  const surface = useColorModeValue('white', 'gray.800')
  const actionBar = useColorModeValue('#F5F5F6', 'gray.900')
  const phone = useShellMode() === 'phone'
  const [prompt, setPrompt] = useState('')
  const [inflight, setInflight] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const variation =
    draft.variations.find((item) => item.id === draft.selectedVariationId) ??
    draft.variations[0]
  const versions = useMemo(() => versionsOf(variation), [variation])
  const selected =
    versions.find((item) => item.id === variation?.selectedVersionId) ??
    versions[versions.length - 1]
  const latest = versions[versions.length - 1]
  const viewingPast = Boolean(selected && latest && selected.id !== latest.id)

  useEffect(() => {
    if (!pending) setInflight(null)
  }, [pending])

  if (!variation || !selected) return null

  const send = (text: string) => {
    const next = text.trim()
    if (next.length < 3 || pending) return
    setInflight(next)
    onRevise(variation.id, next)
    setPrompt('')
  }

  return (
    <Stack gap={4}>
      <Flex
        justify="flex-end"
        mt={{ md: '-52px' }}
      >
        <HStack>
          <Button
            disabled={selected.number <= 1 || pending}
            onClick={() => {
              const previous = versions.find(
                (item) => item.number === selected.number - 1
              )
              if (previous) onSelectVersion(variation.id, previous.id)
            }}
            size="sm"
            variant="outline"
          >
            <LuUndo2 />
            Desfazer
          </Button>
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                aria-label="Mais ações"
                size="sm"
                variant="outline"
              >
                <LuEllipsis />
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    asChild
                    value="manual"
                  >
                    <RouterLink
                      data-testid="open-manual-editor"
                      to={`/social/editor/${draft.id}/${variation.id}`}
                    >
                      <LuPencil />
                      Ajustar manualmente
                    </RouterLink>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => onRestoreVersion(variation.id, selected.id)}
                    value="duplicate"
                  >
                    <LuCopy />
                    Duplicar versão
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => setHistoryOpen(true)}
                    value="history"
                  >
                    <LuEye />
                    Ver histórico completo
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </HStack>
      </Flex>
      <Flex
        align="stretch"
        css={{ '@media (min-width: 1200px)': { flexDirection: 'row' } }}
        direction="column"
        gap={4}
        minW={0}
      >
        <Stack
          bg={surface}
          borderColor="#E4E7EB"
          borderRadius="xl"
          borderWidth="1px"
          flex="1.2"
          gap={3}
          p={4}
        >
          <HStack>
            <Text
              color="#5B6B78"
              fontSize="sm"
            >
              Variação
            </Text>
            {draft.variations.map((item) => {
              const active = item.id === variation.id
              return (
                <Button
                  aria-label={`Variação ${item.position + 1}`}
                  bg={active ? '#E6F5FD' : 'white'}
                  borderColor={active ? '#7BC9F1' : '#E4E7EB'}
                  borderRadius="full"
                  color="#093A58"
                  key={item.id}
                  onClick={() => onSelectVariation(item.id)}
                  size="xs"
                  variant="outline"
                >
                  {item.position + 1}
                </Button>
              )
            })}
          </HStack>
          <Box
            maxW="420px"
            mx="auto"
            position="relative"
            w="full"
          >
            <Box opacity={pending ? 0 : 1}>
              <PostArtwork
                brand={brand}
                format={draft.format}
                slide={selected.slides[0]}
                testId="revision-preview"
              />
            </Box>
            {viewingPast && (
              <Button
                bottom={3}
                data-testid="restore-version"
                left="3"
                onClick={() => onRestoreVersion(variation.id, selected.id)}
                position="absolute"
                size="xs"
              >
                <LuUndo2 />
                Voltar pra esta versão
              </Button>
            )}
            {pending && (
              <Flex
                align="center"
                bg={surface}
                borderRadius="xl"
                data-testid="revision-pending"
                direction="column"
                gap={3}
                inset={0}
                justify="center"
                position="absolute"
              >
                <LuRefreshCw />
                <Box
                  bg="#DCE3E8"
                  borderRadius="md"
                  h="4"
                  w="70%"
                />
                <Box
                  bg="#DCE3E8"
                  borderRadius="md"
                  h="4"
                  w="50%"
                />
                <Text
                  color="#093A58"
                  fontWeight="medium"
                >
                  Gerando nova versão…
                </Text>
              </Flex>
            )}
          </Box>
          <HStack
            align="end"
            data-testid="version-strip"
          >
            <Stack gap={0}>
              <Text
                color="#093A58"
                fontSize="xs"
                fontWeight="semibold"
              >
                Histórico
              </Text>
              <Text
                color="#5B6B78"
                fontSize="xs"
              >
                {versions.length}{' '}
                {versions.length === 1 ? 'versão' : 'versões'}
              </Text>
            </Stack>
            {versions.map((version) => {
              const current = version.id === selected.id
              return (
                <Stack
                  gap={1}
                  key={version.id}
                >
                  <Button
                    borderColor={current ? '#7BC9F1' : '#E4E7EB'}
                    borderWidth={current ? '2px' : '1px'}
                    data-testid={`version-${version.number}`}
                    h="90px"
                    onClick={() => onSelectVersion(variation.id, version.id)}
                    overflow="hidden"
                    p={0}
                    variant="outline"
                    w="72px"
                  >
                    <Box
                      pointerEvents="none"
                      w="72px"
                    >
                      <PostArtwork
                        brand={brand}
                        format={draft.format}
                        slide={version.slides[0]}
                      />
                    </Box>
                  </Button>
                  <Text
                    color={version.number === latest?.number ? '#093A58' : '#5B6B78'}
                    fontSize="xs"
                    fontWeight={version.number === latest?.number ? 'semibold' : 'normal'}
                    textAlign="center"
                  >
                    V{version.number}
                    {version.number === latest?.number ? ' · atual' : ''}
                  </Text>
                </Stack>
              )
            })}
          </HStack>
        </Stack>
        <Stack
          bg={surface}
          borderColor="#E4E7EB"
          borderRadius="xl"
          borderWidth="1px"
          flex="1"
          minH="520px"
          overflow="hidden"
        >
          <HStack
            color="#093A58"
            fontWeight="semibold"
            p={4}
          >
            <LuSparkles />
            Revisar com IA
          </HStack>
          <Stack
            flex="1"
            gap={3}
            overflowY="auto"
            px={4}
          >
            {chatFrom(versions).map((message) =>
              message.role === 'user' ? (
                <Flex
                  justify="flex-end"
                  key={message.id}
                >
                  <Box
                    bg="#093A58"
                    borderRadius="lg"
                    color="white"
                    maxW="85%"
                    px={3}
                    py={2}
                  >
                    <Text fontSize="sm">{message.text}</Text>
                  </Box>
                </Flex>
              ) : (
                <HStack
                  align="flex-start"
                  key={message.id}
                >
                  <Flex
                    align="center"
                    bg="#E6F5FD"
                    borderRadius="full"
                    boxSize="8"
                    color="#093A58"
                    justify="center"
                  >
                    <LuSparkles />
                  </Flex>
                  <Box
                    bg="#F5F5F6"
                    borderRadius="lg"
                    maxW="85%"
                    px={3}
                    py={2}
                  >
                    <Text
                      color="#093A58"
                      fontSize="sm"
                    >
                      {message.text}
                    </Text>
                    <Text
                      color="#5B6B78"
                      fontSize="xs"
                    >
                      Gerou a V{message.number}
                    </Text>
                  </Box>
                </HStack>
              )
            )}
            {inflight && (
              <Flex justify="flex-end">
                <Box
                  bg="#093A58"
                  borderRadius="lg"
                  color="white"
                  maxW="85%"
                  px={3}
                  py={2}
                >
                  <Text fontSize="sm">{inflight}</Text>
                </Box>
              </Flex>
            )}
            {pending && (
              <Text
                color="#5B6B78"
                fontSize="sm"
              >
                IA está gerando a V{versions.length + 1}…
              </Text>
            )}
            {error && (
              <Box
                bg="#FDECEC"
                borderColor="#F3B4B4"
                borderRadius="lg"
                borderWidth="1px"
                data-testid="revision-error"
                p={3}
                role="alert"
              >
                <HStack
                  align="flex-start"
                  gap={2}
                >
                  <Box
                    color="#C2410C"
                    mt="0.5"
                  >
                    <LuTriangleAlert />
                  </Box>
                  <Text
                    color="#8E2A20"
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    Não consegui gerar a nova versão. A V{latest?.number}{' '}
                    continua intacta.
                  </Text>
                </HStack>
                <Button
                  mt={2}
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                >
                  <LuRefreshCw />
                  Tentar de novo
                </Button>
              </Box>
            )}
          </Stack>
          <Stack
            gap={3}
            opacity={pending ? 0.45 : 1}
            pb={3}
            px={4}
          >
            <HStack wrap="wrap">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  borderColor="#E4E7EB"
                  borderRadius="full"
                  color="#093A58"
                  disabled={pending}
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  size="xs"
                  variant="outline"
                >
                  {suggestion}
                </Button>
              ))}
            </HStack>
            <Flex
              borderColor="#E4E7EB"
              borderRadius="md"
              borderWidth="1px"
              gap={2}
              p={1}
            >
              <Textarea
                border="none"
                data-testid="revision-input"
                disabled={pending}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send(prompt)
                  }
                }}
                placeholder={
                  pending ? 'Aguarde a nova versão…' : 'O que você quer mudar?'
                }
                rows={1}
                value={prompt}
              />
              <Button
                bg="#7BC9F1"
                color="#093A58"
                data-testid="revision-send"
                disabled={pending || prompt.trim().length < 3}
                onClick={() => send(prompt)}
              >
                <LuSend />
                Enviar
              </Button>
            </Flex>
          </Stack>
          <Flex
            bg={actionBar}
            direction={phone ? 'column' : 'row'}
            gap={3}
            opacity={pending ? 0.45 : 1}
            p={4}
          >
            <Button
              bg="#7BC9F1"
              color="#093A58"
              data-testid="download-post"
              flex="1"
              minH={phone ? '44px' : undefined}
              onClick={() => onDownload(variation, selected)}
              w={phone ? 'full' : undefined}
            >
              <LuDownload />
              Baixar post
            </Button>
            <Button
              bg={surface}
              color="#093A58"
              data-testid="copy-caption"
              flex="1"
              minH={phone ? '44px' : undefined}
              onClick={() => onCopy(selected)}
              variant="outline"
              w={phone ? 'full' : undefined}
            >
              <LuCopy />
              Copiar legenda
            </Button>
          </Flex>
        </Stack>
      </Flex>
      {historyOpen && (
        <Stack
          bg={surface}
          borderRadius="xl"
          borderWidth="1px"
          p={4}
        >
          <Text fontWeight="semibold">Histórico completo</Text>
          {versions.map((version) => (
            <Button
              justifyContent="flex-start"
              key={version.id}
              onClick={() => {
                onSelectVersion(variation.id, version.id)
                setHistoryOpen(false)
              }}
              variant="ghost"
            >
              V{version.number}
              {version.prompt ? ` · ${version.prompt}` : ' · versão inicial'}
            </Button>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

export function versionsOf(variation?: PostVariation): PostVersion[] {
  if (!variation) return []
  if (variation.versions?.length) return variation.versions
  return [
    {
      id: `${variation.id}-v1`,
      number: 1,
      source: 'generation',
      prompt: null,
      assistantReply: 'Versão inicial pronta.',
      headline: variation.headline,
      badgeText: variation.badgeText,
      captionShort: variation.captionShort,
      captionMedium: variation.captionMedium,
      captionLong: variation.captionLong,
      activeCaption: variation.activeCaption,
      hashtags: variation.hashtags,
      slides: variation.slides,
    },
  ]
}

function chatFrom(versions: PostVersion[]) {
  const messages: Array<{
    id: string
    role: 'user' | 'assistant'
    text: string
    number: number
  }> = []
  for (const version of versions) {
    if (version.prompt) {
      messages.push({
        id: `${version.id}-user`,
        role: 'user',
        text: version.prompt,
        number: version.number,
      })
    }
    if (version.assistantReply) {
      messages.push({
        id: `${version.id}-assistant`,
        role: 'assistant',
        text: version.assistantReply,
        number: version.number,
      })
    }
  }
  return messages
}
