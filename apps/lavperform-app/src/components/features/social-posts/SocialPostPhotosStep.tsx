import { Box, Flex, Image, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuImagePlus, LuX } from 'react-icons/lu'

import { socialPostsService } from '@/services'

import { useSocialMediaTokens } from './socialMediaTokens'

export interface PostPhoto {
  id: string
  url: string
  name: string
  preview?: string
}

interface Props {
  companyId: string
  photos: PostPhoto[]
  creativeFreedom: boolean
  onPhotos: (photos: PostPhoto[]) => void
  onCreativeFreedom: (value: boolean) => void
}

const LIMIT = 10

export function SocialPostPhotosStep({
  companyId,
  photos,
  creativeFreedom,
  onPhotos,
  onCreativeFreedom,
}: Props) {
  const tokens = useSocialMediaTokens()
  const input = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const addFiles = async (list: File[]) => {
    const room = LIMIT - photos.length
    if (room <= 0) {
      setError('Até 10 fotos.')
      return
    }
    const accepted = list.slice(0, room)
    if (list.length > room) setError('Até 10 fotos.')
    let next = photos
    setSending(true)
    for (const file of accepted) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Envie JPG ou PNG.')
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Cada imagem pode ter no máximo 10 MB.')
        continue
      }
      try {
        const saved = await socialPostsService.uploadMedia(companyId, file)
        next = [
          ...next,
          {
            id: saved.data.id,
            url: saved.data.url,
            name: file.name,
            preview: URL.createObjectURL(file),
          },
        ]
        setError(null)
      } catch {
        setError('Não conseguimos enviar esta foto. Tente outra.')
      }
    }
    setSending(false)
    onPhotos(next)
  }

  return (
    <Flex
      data-testid="social-photos-step"
      direction="column"
      gap={4}
    >
      <Text
        color={tokens.text}
        fontSize="14px"
        fontWeight="semibold"
      >
        Fotos para o post (opcional)
      </Text>
      <Flex
        align="center"
        bg={dragOver ? tokens.selectedBg : 'transparent'}
        borderColor={tokens.accent}
        borderRadius="12px"
        borderStyle="dashed"
        borderWidth="1.5px"
        data-testid="photo-dropzone"
        direction="column"
        gap={2}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          void addFiles(Array.from(event.dataTransfer.files))
        }}
        py={6}
      >
        <LuImagePlus color={tokens.deep} size={28} />
        <Text color={tokens.text} fontSize="14px" fontWeight="semibold">
          Arraste fotos aqui
        </Text>
        <Text color={tokens.muted} fontSize="12px">
          JPG ou PNG, até 10 fotos
        </Text>
        <Box
          as="button"
          bg={tokens.card}
          borderColor={tokens.border}
          borderRadius="10px"
          borderWidth="1px"
          color={tokens.text}
          disabled={sending}
          fontSize="14px"
          fontWeight="semibold"
          h="44px"
          mt={1}
          onClick={() => input.current?.click()}
          px={4}
          type="button"
        >
          <Flex align="center" gap={2} justify="center">
            <LuImagePlus size={16} />
            Escolher fotos
          </Flex>
        </Box>
        <input
          accept="image/jpeg,image/png,image/webp"
          hidden
          multiple
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
          ref={input}
          type="file"
        />
      </Flex>
      {error ? (
        <Text color="red.600" fontSize="12px">
          {error}
        </Text>
      ) : null}
      {photos.length > 0 && (
        <Flex gap={3} wrap="wrap">
          {photos.map((photo) => (
            <Box
              borderRadius="12px"
              h="104px"
              key={photo.id}
              overflow="hidden"
              position="relative"
              w="104px"
            >
              <Image
                alt=""
                h="full"
                objectFit="cover"
                src={photo.preview || photo.url}
                w="full"
              />
              <Box
                aria-label={`Remover ${photo.name}`}
                as="button"
                bg="white"
                borderRadius="full"
                color={tokens.deep}
                h="24px"
                onClick={() => onPhotos(photos.filter((item) => item.id !== photo.id))}
                position="absolute"
                right="6px"
                top="6px"
                type="button"
                w="24px"
              >
                <LuX size={14} />
              </Box>
              <Text
                bg="blackAlpha.700"
                bottom={0}
                color="white"
                fontSize="10px"
                left={0}
                position="absolute"
                px={2}
                py={1}
                right={0}
                truncate
              >
                {photo.name}
              </Text>
            </Box>
          ))}
        </Flex>
      )}
      <Text color={tokens.muted} fontSize="12px">
        A IA vai usar estas fotos no post, como um cliente real usaria.
      </Text>
      <Flex
        align="center"
        borderColor={tokens.border}
        borderRadius="12px"
        borderWidth="1px"
        justify="space-between"
        px={4}
        py={3}
      >
        <Box pr={3}>
          <Text color={tokens.text} fontSize="14px" fontWeight="semibold">
            Dar liberdade criativa à IA
          </Text>
          <Text color={tokens.muted} fontSize="12px">
            A IA pode recortar, ajustar cores e criar o fundo.
          </Text>
        </Box>
        <Box
          aria-checked={creativeFreedom}
          aria-label="Dar liberdade criativa à IA"
          as="button"
          bg={creativeFreedom ? tokens.accent : tokens.track}
          borderRadius="full"
          data-testid="creative-freedom"
          flexShrink={0}
          h="26px"
          onClick={() => onCreativeFreedom(!creativeFreedom)}
          position="relative"
          role="switch"
          type="button"
          w="44px"
        >
          <Box
            bg="white"
            borderRadius="full"
            boxSize="20px"
            left={creativeFreedom ? '21px' : '3px'}
            position="absolute"
            top="3px"
          />
        </Box>
      </Flex>
    </Flex>
  )
}
