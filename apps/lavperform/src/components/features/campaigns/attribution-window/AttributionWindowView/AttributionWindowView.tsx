import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'

import { Empty, LoadingState } from '@/components'
import { useAttributionSegments } from '@/hooks/queries'
import type { SegmentAttribution } from '@/types'

import { AttributionCard } from '../AttributionCard/AttributionCard'
import { AttributionModal } from '../AttributionModal/AttributionModal'

function AttributionWindowViewBase() {
  const { data, isLoading, isError } = useAttributionSegments()

  const segments = useMemo(
    () => data?.data ?? [],
    [data?.data]
  )

  const [selectedSegment, setSelectedSegment] = useState<SegmentAttribution | null>(
    null
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpen = useCallback((segment: SegmentAttribution) => {
    setSelectedSegment(segment)
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
    setSelectedSegment(null)
  }, [])

  if (isLoading) return <LoadingState title="Carregando segmentações..." />

  if (isError) {
    return (
      <Empty
        title="Erro ao carregar"
        description="Não foi possível carregar as segmentações."
      />
    )
  }

  if (!segments.length) {
    return (
      <Empty
        title="Nenhuma segmentação encontrada"
        description="Não há segmentações disponíveis para configurar."
      />
    )
  }

  return (
    <Box>
      <Box
        bg="bg.panel"
        borderRadius="md"
        borderWidth="1px"
        mb={4}
        p={4}
      >
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          A janela de atribuição é o período entre o recebimento da mensagem e a
          realização da compra. Esse intervalo é definido com base no segmento
          em que o cliente estava no momento do envio.
        </Text>
      </Box>

      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3 }}
        gap={3}
      >
        {segments.map((segment) => (
          <AttributionCard
            key={segment.id}
            onClick={handleOpen}
            segment={segment}
          />
        ))}
      </SimpleGrid>

      <AttributionModal
        isOpen={isModalOpen}
        onClose={handleClose}
        segment={selectedSegment}
      />
    </Box>
  )
}

const AttributionWindowView = memo(AttributionWindowViewBase) as typeof AttributionWindowViewBase

export { AttributionWindowView }

