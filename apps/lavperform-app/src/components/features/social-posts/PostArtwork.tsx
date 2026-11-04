import { Box, Image, Text } from '@chakra-ui/react'
import { useRef } from 'react'

import type { BrandIdentity, PostLayer, PostSlide } from '@/types'
import { formatAspect } from '@/types'

import { logoSrc } from './brandVisual'

interface Props {
  format: string
  slide: PostSlide
  brand: Pick<
    BrandIdentity,
    'logoLightUrl' | 'logoDarkUrl' | 'titleFont' | 'bodyFont'
  >
  selectedLayerId?: string
  interactive?: boolean
  onSelectLayer?: (id: string) => void
  onMoveLayer?: (id: string, x: number, y: number) => void
  testId?: string
}

export function PostArtwork({
  format,
  slide,
  brand,
  selectedLayerId,
  interactive = false,
  onSelectLayer,
  onMoveLayer,
  testId,
}: Props) {
  const frame = useRef<HTMLDivElement>(null)

  const move = (layer: PostLayer, event: React.PointerEvent) => {
    if (
      !interactive ||
      layer.locked ||
      layer.type === 'background' ||
      layer.type === 'color-band'
    ) {
      return
    }
    const bounds = frame.current?.getBoundingClientRect()
    if (!bounds) return
    event.preventDefault()
    event.stopPropagation()
    onSelectLayer?.(layer.id)
    const drag = (pointer: PointerEvent) => {
      const x = clamp(
        ((pointer.clientX - bounds.left) / bounds.width) * 100,
        8,
        92
      )
      const y = clamp(
        ((pointer.clientY - bounds.top) / bounds.height) * 100,
        6,
        94
      )
      onMoveLayer?.(layer.id, x, y)
    }
    const stop = () => {
      window.removeEventListener('pointermove', drag)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', drag)
    window.addEventListener('pointerup', stop)
  }

  return (
    <Box
      aspectRatio={formatAspect(format)}
      bg={slide.backgroundImage ? 'transparent' : 'blue.200'}
      borderRadius="xl"
      containerType="inline-size"
      data-testid={testId}
      overflow="hidden"
      position="relative"
      ref={frame}
      w="full"
    >
      {slide.backgroundImage ? (
        <Image
          alt=""
          h="full"
          inset={0}
          objectFit="cover"
          position="absolute"
          src={slide.backgroundImage}
          w="full"
        />
      ) : null}
      {slide.layers
        .filter((layer) => layer.visible && layer.type !== 'background')
        .map((layer) => (
          <LayerView
            brand={brand}
            interactive={interactive}
            key={layer.id}
            layer={layer}
            onPointerDown={(event) => move(layer, event)}
            onSelect={() => onSelectLayer?.(layer.id)}
            selected={selectedLayerId === layer.id}
          />
        ))}
    </Box>
  )
}

function LayerView({
  layer,
  brand,
  selected,
  interactive,
  onSelect,
  onPointerDown,
}: {
  layer: PostLayer
  brand: Props['brand']
  selected: boolean
  interactive: boolean
  onSelect: () => void
  onPointerDown: (event: React.PointerEvent) => void
}) {
  const outline = selected ? '2px solid #7BC9F1' : undefined
  if (layer.type === 'color-band') {
    return (
      <Box
        bg={layer.color || '#093A58'}
        h={`${layer.height ?? 44}%`}
        left={`${layer.x ?? 0}%`}
        onClick={onSelect}
        opacity={layer.opacity ?? 0.7}
        outline={outline}
        position="absolute"
        top={`${layer.y ?? 0}%`}
        w={`${layer.width ?? 100}%`}
      />
    )
  }

  const shared = {
    cursor: interactive && !layer.locked ? 'grab' : 'default',
    left: `${layer.x ?? 50}%`,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation()
      onSelect()
    },
    onPointerDown,
    outline,
    position: 'absolute' as const,
    top: `${layer.y ?? 50}%`,
    transform: 'translate(-50%, 0)',
  }

  if (layer.type === 'logo') {
    return (
      <Image
        alt="Logo da marca"
        maxW="46%"
        src={logoSrc(brand, layer.logoVariant)}
        w={`${layer.width ?? 28}%`}
        {...shared}
      />
    )
  }

  if (layer.type === 'badge') {
    return (
      <Text
        bg={layer.backgroundColor || '#FFD23F'}
        borderRadius="full"
        color={layer.color || '#093A58'}
        fontFamily={layer.fontFamily || brand.titleFont}
        fontSize={`${((layer.fontSize ?? 18) / 1080) * 100}cqw`}
        fontWeight="700"
        px="3"
        py="1"
        {...shared}
      >
        {layer.text}
      </Text>
    )
  }

  return (
    <Text
      color={layer.color || 'white'}
      fontFamily={layer.fontFamily || brand.titleFont}
      fontSize={`${((layer.fontSize ?? 46) / 1080) * 100}cqw`}
      fontWeight="800"
      lineHeight="1.05"
      textAlign="center"
      w={`${layer.width ?? 86}%`}
      {...shared}
    >
      {layer.text}
    </Text>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
