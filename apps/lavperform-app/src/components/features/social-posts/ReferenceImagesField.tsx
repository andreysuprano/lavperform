import { Box, Button, Flex, Image, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'

import { useColorModeValue } from '@/components/ui/color-mode'
import { socialPostsService } from '@/services'

import { prepareReferenceImage } from './referenceImage'

interface Slot {
  key: string
  id?: string
  dataUrl?: string
  progress: number
  error?: string
}

interface Props {
  companyId: string
  imageModel?: string
  onChange: (ids: string[]) => void
  onUseModel?: (model: string) => void
}

const LIMIT = 5

export function ReferenceImagesField({
  companyId,
  imageModel,
  onChange,
  onUseModel,
}: Props) {
  const labelColor = useColorModeValue('#093A58', 'gray.100')
  const labelWeight = useColorModeValue('medium', '600')
  const countColor = useColorModeValue('#5B6B78', 'gray.400')
  const zoneBg = useColorModeValue('white', 'transparent')
  const zoneDragBg = useColorModeValue('#E8F6FD', 'rgba(123,201,241,0.16)')
  const zoneBorderOpen = useColorModeValue('#7BC9F1', 'whiteAlpha.300')
  const zoneBorderFull = useColorModeValue('#E4E7EB', 'whiteAlpha.300')
  const slotBg = useColorModeValue('#F5F5F6', 'whiteAlpha.100')
  const slotIcon = useColorModeValue('#5B6B78', 'gray.400')
  const trackBg = useColorModeValue('#E4E7EB', 'whiteAlpha.200')
  const chipBg = useColorModeValue('white', 'gray.700')
  const warningBg = useColorModeValue('#FFF7ED', 'orange.900/20')
  const warningBorder = useColorModeValue('#F3C9A0', 'orange.700')
  const warningText = useColorModeValue('#9A3412', 'orange.200')
  const input = useRef<HTMLInputElement>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [unsupported, setUnsupported] = useState<string | null>(null)
  const ready = slots.filter((slot) => slot.id)
  const sending = slots.filter((slot) => !slot.id && !slot.error).length
  const counted = Math.min(LIMIT, ready.length + sending)
  const full = ready.length >= LIMIT

  const publish = (next: Slot[]) => {
    onChange(next.filter((slot) => slot.id).map((slot) => slot.id as string))
  }

  const addFiles = async (files: File[]) => {
    const room = LIMIT - ready.length
    const accepted = files.slice(0, room)
    if (files.length > room) {
      setSlots((current) => [
        ...current.filter((slot) => !slot.error),
        {
          key: `limit-${Date.now()}`,
          progress: 100,
          error: 'Limite de 5 imagens',
        },
      ])
    }
    for (const file of accepted) {
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
      setSlots((current) => [
        ...current.filter((slot) => slot.error !== 'Limite de 5 imagens'),
        { key, progress: 5 },
      ])
      try {
        const dataUrl = await prepareReferenceImage(file, (progress) => {
          setSlots((current) =>
            current.map((slot) =>
              slot.key === key ? { ...slot, progress: Math.min(progress, 60) } : slot
            )
          )
        })
        setSlots((current) =>
          current.map((slot) =>
            slot.key === key ? { ...slot, dataUrl, progress: 70 } : slot
          )
        )
        const saved = await socialPostsService.addReference(companyId, dataUrl)
        setSlots((current) => {
          const next = current.map((slot) =>
            slot.key === key
              ? { ...slot, id: saved.data.id, dataUrl, progress: 100 }
              : slot
          )
          publish(next)
          const attached = next.filter((slot) => slot.id)
          if (attached.length === 1 && !imageModel) {
            void socialPostsService.imageModel().then((status) => {
              if (!status.data.acceptsImages && status.data.suggestion) {
                setUnsupported(status.data.suggestion)
              }
            })
          }
          return next
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não conseguimos ler esta imagem. Tente outra.'
        setSlots((current) =>
          current.map((slot) =>
            slot.key === key ? { ...slot, progress: 100, error: message } : slot
          )
        )
      }
    }
  }

  const remove = async (slot: Slot) => {
    if (slot.id) {
      await socialPostsService.removeReference(slot.id).catch(() => undefined)
    }
    setSlots((current) => {
      const next = current.filter((item) => item.key !== slot.key)
      publish(next)
      return next
    })
  }

  const onDropSlot = (targetKey: string, sourceKey: string) => {
    setSlots((current) => {
      const next = [...current]
      const from = next.findIndex((item) => item.key === sourceKey)
      const to = next.findIndex((item) => item.key === targetKey)
      if (from < 0 || to < 0) return current
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      const ids = next.filter((item) => item.id).map((item) => item.id as string)
      if (companyId && ids.length) {
        socialPostsService.reorderReferences(companyId, ids).catch(() => undefined)
      }
      onChange(ids)
      return next
    })
  }

  return (
    <Box>
      <Flex
        align="center"
        justify="space-between"
        mb={1}
      >
        <Text
          color={labelColor}
          fontSize="sm"
          fontWeight={labelWeight}
        >
          Imagens de referência (opcional)
        </Text>
        <Text
          color={countColor}
          data-testid="reference-count"
          fontSize="xs"
        >
          {counted}/5
          {sending > 0 ? ' · enviando' : ''}
        </Text>
      </Flex>
      <Text
        color="fg.muted"
        fontSize="xs"
        mb={2}
      >
        Mostre fotos da sua loja, produto ou um estilo que você curte. A IA usa
        como inspiração pro fundo.
      </Text>
      <Flex
        align="center"
        bg={dragOver ? zoneDragBg : zoneBg}
        border="1px dashed"
        borderColor={full ? zoneBorderFull : zoneBorderOpen}
        borderRadius="lg"
        gap={2}
        minH="88px"
        onDragLeave={() => setDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          if (!full) setDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          if (full) return
          void addFiles([...event.dataTransfer.files])
        }}
        opacity={full ? 0.55 : 1}
        p={2}
        pointerEvents={full ? 'none' : 'auto'}
        wrap="wrap"
      >
        {slots.map((slot) => (
          <Box
            className="ref-slot"
            css={{ '&:hover .ref-preview': { display: 'block' } }}
            data-testid={slot.error ? 'reference-error' : 'reference-thumb'}
            draggable={!slot.error}
            h="72px"
            key={slot.key}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={(event) =>
              event.dataTransfer.setData('text/plain', slot.key)
            }
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDropSlot(slot.key, event.dataTransfer.getData('text/plain'))
            }}
            position="relative"
            role="listitem"
            w="72px"
          >
            {slot.dataUrl ? (
              <Box
                h="72px"
                position="relative"
                w="72px"
              >
                <Image
                  alt=""
                  borderRadius="md"
                  h="72px"
                  objectFit="cover"
                  src={slot.dataUrl}
                  w="72px"
                />
                {slot.progress < 100 && (
                  <Box
                    bg={trackBg}
                    borderBottomRadius="md"
                    bottom="0"
                    h="4px"
                    left="0"
                    overflow="hidden"
                    position="absolute"
                    right="0"
                    zIndex={1}
                  >
                    <Box
                      bg="#7BC9F1"
                      data-testid="reference-progress"
                      h="3px"
                      w={`${slot.progress}%`}
                    />
                  </Box>
                )}
              </Box>
            ) : (
              <Flex
                align="center"
                bg={slotBg}
                borderRadius="md"
                direction="column"
                h="72px"
                justify="center"
                position="relative"
                px={1}
              >
                {slot.error ? (
                  <Text
                    color="#8E2A20"
                    fontSize="10px"
                    textAlign="center"
                  >
                    {slot.error}
                  </Text>
                ) : (
                  <Box
                    bg={trackBg}
                    borderRadius="full"
                    bottom="2"
                    h="3px"
                    left="2"
                    overflow="hidden"
                    position="absolute"
                    right="2"
                  >
                    <Box
                      bg="#7BC9F1"
                      data-testid="reference-progress"
                      h="3px"
                      w={`${slot.progress}%`}
                    />
                  </Box>
                )}
              </Flex>
            )}
            {slot.dataUrl && (
              <Box
                bg={chipBg}
                borderRadius="md"
                boxShadow="md"
                className="ref-preview"
                display="none"
                left="80px"
                p={1}
                position="absolute"
                top="0"
                zIndex={3}
              >
                <Image
                  alt=""
                  h="160px"
                  objectFit="cover"
                  src={slot.dataUrl}
                  w="160px"
                />
              </Box>
            )}
            <Box
              as="button"
              bg={chipBg}
              borderRadius="full"
              borderWidth="1px"
              h="5"
              onClick={() => void remove(slot)}
              position="absolute"
              right="-1"
              top="-1"
              w="5"
            >
              <LuX />
            </Box>
          </Box>
        ))}
        {Array.from({ length: Math.max(0, LIMIT - slots.length) }, (_, index) => (
          <Flex
            align="center"
            aria-disabled={full}
            as="button"
            bg={slotBg}
            borderRadius="md"
            color={slotIcon}
            cursor={full ? 'not-allowed' : 'pointer'}
            data-testid="reference-slot"
            disabled={full}
            h="72px"
            justify="center"
            key={`empty-${index}`}
            onClick={() => input.current?.click()}
            type="button"
            w="72px"
          >
            <LuImagePlus />
          </Flex>
        ))}
        <input
          accept="image/jpeg,image/png,image/webp"
          data-testid="reference-input"
          disabled={full}
          hidden
          multiple
          onChange={(event) => {
            const files = [...(event.target.files ?? [])]
            event.target.value = ''
            void addFiles(files)
          }}
          ref={input}
          type="file"
        />
      </Flex>
      {full && (
        <Text
          color="#52525B"
          data-testid="reference-limit"
          fontSize="sm"
          mt={2}
        >
          Limite de 5 imagens
        </Text>
      )}
      {unsupported && !imageModel && (
        <Box
          bg={warningBg}
          borderColor={warningBorder}
          borderRadius="md"
          borderWidth="1px"
          data-testid="reference-model-warning"
          mt={2}
          p={3}
        >
          <Text
            color={warningText}
            fontSize="sm"
          >
            Este modelo não usa imagens de referência
          </Text>
          <Button
            bg="#7BC9F1"
            color="#093A58"
            data-testid="use-reference-model"
            mt={2}
            onClick={() => {
              onUseModel?.(unsupported)
              setUnsupported(null)
            }}
            size="sm"
          >
            Usar um modelo que aceita referências
          </Button>
        </Box>
      )}
    </Box>
  )
}
