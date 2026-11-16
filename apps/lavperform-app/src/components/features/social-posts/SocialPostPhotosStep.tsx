import { Box, Flex, Image, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuGripVertical, LuImagePlus, LuX } from 'react-icons/lu'

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
  format?: string
  creativeFreedom: boolean
  onPhotos: (photos: PostPhoto[]) => void
  onCreativeFreedom: (value: boolean) => void
}

const LIMIT = 10

export function SocialPostPhotosStep({
  companyId,
  photos,
  format,
  creativeFreedom,
  onPhotos,
  onCreativeFreedom,
}: Props) {
  const tokens = useSocialMediaTokens()
  const input = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const carousel = format === 'carousel'
  const compactDrop = carousel && photos.length > 0

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= photos.length) return
    const next = [...photos]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onPhotos(next)
  }

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
      <Flex
        align="baseline"
        justify="space-between"
      >
        <Text
          color={tokens.text}
          fontSize="14px"
          fontWeight="semibold"
        >
          {carousel ? 'Fotos do carrossel' : 'Fotos para o post (opcional)'}
        </Text>
        {carousel ? (
          <Text
            color={tokens.muted}
            fontSize="12px"
          >
            {photos.length} de {LIMIT}
          </Text>
        ) : null}
      </Flex>
      <Flex
        align={compactDrop ? 'center' : 'center'}
        bg={dragOver ? tokens.selectedBg : 'transparent'}
        borderColor={tokens.accent}
        borderRadius="12px"
        borderStyle="dashed"
        borderWidth="1.5px"
        data-testid="photo-dropzone"
        direction={compactDrop ? 'row' : 'column'}
        gap={2}
        justify={compactDrop ? 'space-between' : 'center'}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          if (event.dataTransfer.files.length) {
            void addFiles(Array.from(event.dataTransfer.files))
          }
        }}
        px={compactDrop ? 3 : 0}
        py={compactDrop ? 3 : 6}
      >
        {compactDrop ? (
          <Text
            color={tokens.text}
            fontSize="13px"
            fontWeight="semibold"
          >
            Arraste mais fotos aqui
          </Text>
        ) : (
          <>
            <LuImagePlus
              color={tokens.deep}
              size={28}
            />
            <Text
              color={tokens.text}
              fontSize="14px"
              fontWeight="semibold"
            >
              Arraste fotos aqui
            </Text>
            <Text
              color={tokens.muted}
              fontSize="12px"
            >
              JPG ou PNG, até 10 fotos
            </Text>
          </>
        )}
        <Box
          as="button"
          bg={tokens.card}
          borderColor={tokens.border}
          borderRadius="10px"
          borderWidth="1px"
          color={tokens.text}
          disabled={sending || photos.length >= LIMIT}
          fontSize="14px"
          fontWeight="semibold"
          h="44px"
          mt={compactDrop ? 0 : 1}
          onClick={() => input.current?.click()}
          px={4}
          type="button"
        >
          <Flex
            align="center"
            gap={2}
            justify="center"
          >
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
        <Text
          color="red.600"
          fontSize="12px"
        >
          {error}
        </Text>
      ) : null}
      {carousel && photos.length > 0 ? (
        <Flex
          data-testid="carousel-photos"
          direction="column"
          gap={2}
        >
          {photos.map((photo, index) => (
            <Flex
              align="center"
              bg={tokens.card}
              borderColor={tokens.border}
              borderRadius="12px"
              borderWidth="1px"
              draggable
              gap={3}
              key={photo.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDragFrom(index)}
              onDrop={() => {
                if (dragFrom != null) reorder(dragFrom, index)
                setDragFrom(null)
              }}
              px={3}
              py={2}
            >
              <Box
                aria-label={`Arrastar ${photo.name}`}
                color={tokens.muted}
                cursor="grab"
              >
                <LuGripVertical size={16} />
              </Box>
              <Text
                color={tokens.text}
                fontSize="13px"
                fontWeight="semibold"
                w="16px"
              >
                {index + 1}
              </Text>
              <Image
                alt=""
                borderRadius="8px"
                boxSize="48px"
                objectFit="cover"
                src={photo.preview || photo.url}
              />
              <Box flex="1" minW={0}>
                <Text
                  color={tokens.text}
                  fontSize="13px"
                  fontWeight="semibold"
                  truncate
                >
                  {photo.name}
                </Text>
                <Text
                  color={tokens.muted}
                  fontSize="11px"
                >
                  {index === 0 ? 'Capa do carrossel' : `Imagem ${index + 1}`}
                </Text>
              </Box>
              <Box
                aria-label={`Remover ${photo.name}`}
                as="button"
                color={tokens.deep}
                h="32px"
                onClick={() => onPhotos(photos.filter((item) => item.id !== photo.id))}
                type="button"
                w="32px"
              >
                <LuX size={16} />
              </Box>
            </Flex>
          ))}
        </Flex>
      ) : null}
      {!carousel && photos.length > 0 ? (
        <Flex
          gap={3}
          wrap="wrap"
        >
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
      ) : null}
      <Text
        color={tokens.muted}
        fontSize="12px"
      >
        {carousel
          ? 'Arraste para mudar a ordem. A foto 1 é a capa.'
          : 'A IA vai usar estas fotos no post, como um cliente real usaria.'}
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
          <Text
            color={tokens.text}
            fontSize="14px"
            fontWeight="semibold"
          >
            Dar liberdade criativa à IA
          </Text>
          <Text
            color={tokens.muted}
            fontSize="12px"
          >
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
