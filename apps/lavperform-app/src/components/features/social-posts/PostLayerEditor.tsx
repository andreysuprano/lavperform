import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import {
  LuCopy,
  LuDownload,
  LuEye,
  LuEyeOff,
  LuGripVertical,
  LuImage,
  LuLock,
  LuLockOpen,
  LuPlus,
  LuRefreshCw,
  LuType,
} from 'react-icons/lu'

import type { BrandIdentity, PostLayer, PostVariation } from '@/types'
import { captionWithHashtags, FONT_OPTIONS } from '@/types'

import { contrastRatio } from './brandVisual'
import { PostArtwork } from './PostArtwork'

interface Props {
  variation: PostVariation
  format: string
  slideCount: number
  brand: BrandIdentity
  busy?: boolean
  onChange: (variation: PostVariation) => void
  onNewBackground: (slideIndex: number) => void
  onDownload: (slideIndex: number) => void
  onCopyCaption: () => void
}

export function PostLayerEditor({
  variation,
  format,
  slideCount,
  brand,
  busy,
  onChange,
  onNewBackground,
  onDownload,
  onCopyCaption,
}: Props) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [selectedId, setSelectedId] = useState('title')
  const [history, setHistory] = useState<PostVariation[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [preview, setPreview] = useState<'instagram' | 'facebook' | 'story'>(
    'instagram'
  )
  const slide = variation.slides[slideIndex] ?? variation.slides[0]
  const selected =
    slide?.layers.find((layer) => layer.id === selectedId) ?? slide?.layers[0]
  const contrast = useMemo(() => {
    if (!selected?.color) return null
    return contrastRatio(selected.color, brand.deepColor)
  }, [brand.deepColor, selected?.color])

  const commit = (next: PostVariation) => {
    setHistory((current) => [...current.slice(-19), variation])
    onChange(next)
  }

  const updateLayer = (patch: Partial<PostLayer>) => {
    if (!slide || !selected) return
    const layers = slide.layers.map((layer) =>
      layer.id === selected.id ? { ...layer, ...patch } : layer
    )
    const slides = variation.slides.map((item, index) =>
      index === slideIndex ? { ...item, layers } : item
    )
    const headline =
      selected.type === 'title' && patch.text != null
        ? patch.text
        : variation.headline
    const badgeText =
      selected.type === 'badge' && patch.text != null
        ? patch.text
        : variation.badgeText
    commit({ ...variation, headline, badgeText, slides })
  }

  const moveLayer = (id: string, x: number, y: number) => {
    if (!slide) return
    const layers = slide.layers.map((layer) =>
      layer.id === id ? { ...layer, x, y } : layer
    )
    const slides = variation.slides.map((item, index) =>
      index === slideIndex ? { ...item, layers } : item
    )
    onChange({ ...variation, slides })
  }

  const addText = () => {
    if (!slide) return
    const layer: PostLayer = {
      id: `text-${Date.now()}`,
      type: 'text',
      label: 'Texto',
      text: 'Novo texto',
      fontFamily: brand.titleFont,
      fontSize: 28,
      color: '#FFFFFF',
      x: 50,
      y: 40,
      width: 70,
      locked: false,
      visible: true,
    }
    const slides = variation.slides.map((item, index) =>
      index === slideIndex ? { ...item, layers: [...item.layers, layer] } : item
    )
    setSelectedId(layer.id)
    commit({ ...variation, slides })
  }

  return (
    <Grid
      gap={4}
      templateColumns={{ base: '1fr', xl: '260px minmax(0, 1fr) 280px' }}
    >
      <Card.Root>
        <Card.Body gap={3}>
          <Flex justify="space-between">
            <Heading size="sm">Camadas</Heading>
            <Button
              onClick={addText}
              size="xs"
              variant="ghost"
            >
              <LuPlus />
              Adicionar
            </Button>
          </Flex>
          <Stack gap={1}>
            {[...(slide?.layers ?? [])].reverse().map((layer) => (
              <Flex
                align="center"
                bg={layer.id === selected?.id ? 'blue.50' : 'transparent'}
                borderRadius="md"
                draggable
                gap={2}
                key={layer.id}
                onClick={() => setSelectedId(layer.id)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDragId(layer.id)}
                onDrop={() => {
                  if (!slide || !dragId || dragId === layer.id) return
                  const visual = [...slide.layers].reverse()
                  const ids = visual.map((item) => item.id)
                  const from = ids.indexOf(dragId)
                  const to = ids.indexOf(layer.id)
                  if (from < 0 || to < 0) return
                  ids.splice(from, 1)
                  ids.splice(to, 0, dragId)
                  const byId = new Map(slide.layers.map((item) => [item.id, item]))
                  const next = ids
                    .slice()
                    .reverse()
                    .map((id) => byId.get(id))
                    .filter((item): item is PostLayer => Boolean(item))
                  const slides = variation.slides.map((item, index) =>
                    index === slideIndex ? { ...item, layers: next } : item
                  )
                  commit({ ...variation, slides })
                  setDragId(null)
                }}
                px={2}
                py={1}
              >
                <Box color="fg.muted">
                  <LuGripVertical />
                </Box>
                {layer.type === 'background' ? <LuImage /> : <LuType />}
                <Stack
                  flex="1"
                  gap={0}
                >
                  <Text fontSize="sm">{layer.label}</Text>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    {layer.text || layer.color || layer.type}
                  </Text>
                </Stack>
                <Button
                  aria-label={layer.visible ? 'Ocultar camada' : 'Mostrar camada'}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedId(layer.id)
                    const layers = slide.layers.map((item) =>
                      item.id === layer.id
                        ? { ...item, visible: !item.visible }
                        : item
                    )
                    const slides = variation.slides.map((item, index) =>
                      index === slideIndex ? { ...item, layers } : item
                    )
                    commit({ ...variation, slides })
                  }}
                  size="xs"
                  variant="ghost"
                >
                  {layer.visible ? <LuEye /> : <LuEyeOff />}
                </Button>
                <Button
                  aria-label={layer.locked ? 'Desbloquear camada' : 'Bloquear camada'}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedId(layer.id)
                    const layers = slide.layers.map((item) =>
                      item.id === layer.id
                        ? { ...item, locked: !item.locked }
                        : item
                    )
                    const slides = variation.slides.map((item, index) =>
                      index === slideIndex ? { ...item, layers } : item
                    )
                    commit({ ...variation, slides })
                  }}
                  size="xs"
                  variant="ghost"
                >
                  {layer.locked ? <LuLock /> : <LuLockOpen />}
                </Button>
              </Flex>
            ))}
          </Stack>
          <Box
            bg="blue.50"
            borderRadius="lg"
            color="blue.900"
            fontSize="sm"
            p={3}
          >
            Texto, logo e cores vêm da identidade da marca. Só o fundo vem da
            IA — troque-o sem perder o resto.
          </Box>
        </Card.Body>
      </Card.Root>
      <Stack gap={3}>
        <Flex
          justify="space-between"
          wrap="wrap"
        >
          <HStack>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Slide
            </Text>
            {Array.from(
              { length: Math.max(slideCount, variation.slides.length) },
              (_, index) => (
                <Button
                  borderRadius="full"
                  key={index}
                  onClick={() => setSlideIndex(index)}
                  size="sm"
                  variant={index === slideIndex ? 'solid' : 'outline'}
                >
                  {index + 1}
                </Button>
              )
            )}
          </HStack>
          <HStack>
            {(
              [
                ['instagram', 'Instagram'],
                ['facebook', 'Facebook'],
                ['story', 'Story'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                onClick={() => setPreview(value)}
                size="xs"
                variant={preview === value ? 'solid' : 'outline'}
              >
                {label}
              </Button>
            ))}
          </HStack>
          <HStack>
            <Button
              loading={busy}
              onClick={() => onNewBackground(slideIndex)}
              size="sm"
              variant="outline"
            >
              <LuRefreshCw />
              Novo fundo
            </Button>
            <Button
              disabled={history.length === 0}
              onClick={() => {
                const previous = history[history.length - 1]
                setHistory((current) => current.slice(0, -1))
                if (previous) onChange(previous)
              }}
              size="sm"
              variant="ghost"
            >
              Desfazer
            </Button>
          </HStack>
        </Flex>
        <Box
          maxW="460px"
          mx="auto"
          w="full"
        >
          {slide && (
            <PostArtwork
              brand={brand}
              format={
                preview === 'story'
                  ? 'story'
                  : preview === 'facebook'
                    ? 'feed'
                    : format
              }
              interactive
              onMoveLayer={moveLayer}
              onSelectLayer={setSelectedId}
              selectedLayerId={selected?.id}
              slide={slide}
              testId="editor-canvas"
            />
          )}
        </Box>
        <HStack justify="flex-end">
          <Button
            bg="#7BC9F1"
            color="#093A58"
            data-testid="download-post"
            onClick={() => onDownload(slideIndex)}
          >
            <LuDownload />
            Baixar imagem
          </Button>
          <Button
            data-testid="editor-copy-caption"
            onClick={onCopyCaption}
            variant="outline"
          >
            <LuCopy />
            Copiar legenda
          </Button>
        </HStack>
      </Stack>
      <Stack gap={3}>
        <Card.Root>
          <Card.Body gap={3}>
            <Heading size="sm">
              {selected?.type === 'title'
                ? 'Título selecionado'
                : selected?.label || 'Camada'}
            </Heading>
            {selected && ['title', 'badge', 'text'].includes(selected.type) && (
              <>
                <Textarea
                  data-testid="layer-title"
                  onChange={(event) =>
                    updateLayer({ text: event.target.value })
                  }
                  value={selected.text ?? ''}
                />
                <Grid
                  gap={2}
                  templateColumns="1fr 90px"
                >
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      onChange={(event) =>
                        updateLayer({ fontFamily: event.target.value })
                      }
                      value={selected.fontFamily || brand.titleFont}
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option
                          key={font}
                          value={font}
                        >
                          {font}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                  <Input
                    max={96}
                    min={12}
                    onChange={(event) =>
                      updateLayer({ fontSize: Number(event.target.value) })
                    }
                    type="number"
                    value={selected.fontSize ?? 46}
                  />
                </Grid>
                <HStack>
                  {[
                    brand.primaryColor,
                    brand.deepColor,
                    brand.accentColor,
                    '#FFFFFF',
                  ].map((color) => (
                    <Button
                      aria-label={color}
                      bg={color}
                      borderColor={
                        selected.color === color ? 'blue.500' : 'border'
                      }
                      borderWidth="2px"
                      h="8"
                      key={color}
                      minW="8"
                      onClick={() => updateLayer({ color })}
                      p={0}
                    />
                  ))}
                </HStack>
                {contrast != null && (
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    Contraste {contrast.toFixed(1).replace('.', ',')}:1 sobre a
                    cor profunda.
                  </Text>
                )}
              </>
            )}
            {selected?.type === 'logo' && (
              <Field.Root>
                <Field.Label>Versão da logo</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    onChange={(event) =>
                      updateLayer({
                        logoVariant: event.target.value as 'light' | 'dark',
                      })
                    }
                    value={selected.logoVariant || 'light'}
                  >
                    <option value="light">Fundo claro</option>
                    <option value="dark">Fundo escuro</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Field.Root>
            )}
            {selected?.type === 'color-band' && (
              <Field.Root>
                <Field.Label>Cor da faixa</Field.Label>
                <Input
                  onChange={(event) =>
                    updateLayer({ color: event.target.value })
                  }
                  type="color"
                  value={selected.color || brand.deepColor}
                />
              </Field.Root>
            )}
            {selected?.type === 'background' && (
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Gerada e bloqueada. Use “Novo fundo” para trocar só a arte, sem
                reescrever o texto.
              </Text>
            )}
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body gap={2}>
            <Heading size="xs">Prévia da legenda</Heading>
            <Text
              fontSize="sm"
              whiteSpace="pre-wrap"
            >
              {captionWithHashtags(variation)}
            </Text>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Grid>
  )
}
