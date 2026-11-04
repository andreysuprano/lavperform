import { Box, Flex, Image, Progress, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'

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
  onChange: (ids: string[]) => void
}

const LIMIT = 5

export function ReferenceImagesField({ companyId, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [dragOver, setDragOver] = useState(false)
  const ready = slots.filter((slot) => slot.id)
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
              slot.key === key ? { ...slot, progress } : slot
            )
          )
        })
        const saved = await socialPostsService.addReference(companyId, dataUrl)
        setSlots((current) => {
          const next = current.map((slot) =>
            slot.key === key
              ? { ...slot, id: saved.data.id, dataUrl, progress: 100 }
              : slot
          )
          publish(next)
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
          color="#093A58"
          fontSize="sm"
          fontWeight="medium"
        >
          Imagens de referência (opcional)
        </Text>
        <Text
          color="#5B6B78"
          data-testid="reference-count"
          fontSize="xs"
        >
          {ready.length}/5
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
        bg={dragOver ? '#E8F6FD' : 'white'}
        border="1px dashed"
        borderColor={full ? '#E4E7EB' : '#7BC9F1'}
        borderRadius="lg"
        gap={2}
        minH="88px"
        onDragOver={(event) => {
          event.preventDefault()
          if (!full) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          if (full) return
          void addFiles([...event.dataTransfer.files])
        }}
        opacity={full ? 0.6 : 1}
        p={2}
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
            onDragStart={(event) =>
              event.dataTransfer.setData('text/plain', slot.key)
            }
            onDragOver={(event) => event.preventDefault()}
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
              <Image
                alt=""
                borderRadius="md"
                h="72px"
                objectFit="cover"
                src={slot.dataUrl}
                w="72px"
              />
            ) : (
              <Flex
                align="center"
                bg="#F5F5F6"
                borderRadius="md"
                direction="column"
                h="72px"
                justify="center"
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
                  <Progress.Root
                    value={slot.progress}
                    w="full"
                  >
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                )}
              </Flex>
            )}
            {slot.dataUrl && (
              <Box
                bg="white"
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
              bg="white"
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
            bg="#F5F5F6"
            borderRadius="md"
            color="#5B6B78"
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
          color="#8E2A20"
          data-testid="reference-limit"
          fontSize="xs"
          mt={1}
        >
          Limite de 5 imagens
        </Text>
      )}
    </Box>
  )
}
