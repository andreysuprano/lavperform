import { Card, HStack, Text } from '@chakra-ui/react'
import { memo, type KeyboardEvent, useCallback } from 'react'

import { useWhiteLabel } from '@/config'

import type { Props } from './AttributionCard.types'

const SEGMENT_EMOJI: Record<string, string> = {
  campeao: '🏆',
  fiel: '🤝',
  promissor: '⭐',
  em_risco: '⚠️',
  perdido: '💔',
  novo: '✨',
  em_potencial: '📈',
  hibernando: '💤',
  nao_posso_perder: '💎',
  precisa_de_atencao: '🔔',
  quase_dormente: '😴',
}

function AttributionCardBase({ segment, onClick }: Props) {
  const { colorPalette } = useWhiteLabel()

  const handleClick = useCallback(() => onClick(segment), [onClick, segment])
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  const hoverBorder = `${colorPalette}.200`
  const segmentEmoji = SEGMENT_EMOJI[segment.id] ?? '📋'

  return (
    <Card.Root
      aria-label={`Configurar janela de atribuição: ${segment.name}`}
      cursor="pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      transition="border-color 0.15s ease, box-shadow 0.15s ease"
      _focusVisible={{
        outline: 'none',
        borderColor: hoverBorder,
        boxShadow: `0 0 0 3px var(--chakra-colors-${colorPalette}-100)`,
      }}
      _hover={{
        borderColor: hoverBorder,
      }}
    >
      <Card.Body gap={1}>
        <Card.Title fontSize="sm">
          <HStack gap={2}>
            <Text
              aria-hidden
              as="span"
              fontSize="lg"
              lineHeight="1"
            >
              {segmentEmoji}
            </Text>
            <Text fontSize="sm">{segment.name}</Text>
          </HStack>
        </Card.Title>
        {!!segment.description && (
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {segment.description}
          </Text>
        )}
        <Text
          color="fg.muted"
          fontSize="xs"
          mt={1}
        >
          Conversão em:{' '}
          <Text
            as="span"
            color="fg"
            fontWeight="semibold"
          >
            {segment.conversionDays} dias
          </Text>
        </Text>
      </Card.Body>
    </Card.Root>
  )
}

const AttributionCard = memo(AttributionCardBase) as typeof AttributionCardBase

export { AttributionCard, type Props as AttributionCardProps }
