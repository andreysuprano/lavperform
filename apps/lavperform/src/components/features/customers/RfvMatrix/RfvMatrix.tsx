import { Flex, Stack } from '@chakra-ui/react'
import { memo, useMemo, useRef } from 'react'

import { Empty, LoadingState } from '@/components'
import { useRfvMatrixLayout } from '@/hooks/useRfvMatrixLayout'
import { useRfvMatrix } from '@/hooks/queries'
import { RFV_SEGMENT_POSITIONS } from '@/utils/constants/rfvMatrix'

import { RfvMatrixAxes } from './RfvMatrixAxes'
import { RfvMatrixHeader } from './RfvMatrixHeader'
import { RfvMatrixLegend } from './RfvMatrixLegend'
import { RfvMatrixTreemap } from './RfvMatrixTreemap'
import type { Props } from './RfvMatrix.types'

function RfvMatrixBase({
  companyId,
  selectedCategories,
  onCategoryToggle,
}: Props) {
  const { data, isLoading } = useRfvMatrix(companyId)
  const containerRef = useRef<HTMLDivElement>(null)

  const { layout } = useRfvMatrixLayout({
    data,
    containerRef,
  })

  const hasNoData = useMemo(() => {
    if (!data) return true

    const totalCount = RFV_SEGMENT_POSITIONS.reduce((sum, position) => {
      const segmentData = data[position.key]
      return sum + (segmentData?.count || 0)
    }, 0)

    return totalCount === 0
  }, [data])

  if (isLoading) return <LoadingState title="Carregando Matriz RFV..." />
  if (hasNoData || layout.length === 0) {
    return (
      <Empty
        description="Não há dados de segmentação RFV disponíveis. A matriz será exibida quando houver clientes cadastrados e classificados."
        title="Nenhum daddo da Matriz RFV encontrado"
      />
    )
  }

  return (
    <Stack gap={6}>
      <RfvMatrixHeader />

      <Flex
        direction="column"
        gap={{ base: 3, md: 4 }}
        maxW={{ base: '100%', md: '100%', lg: '900px', xl: '1000px' }}
        mx="auto"
        px={{ base: 2, md: 3, lg: 0 }}
        position="relative"
        w="full"
      >
        <RfvMatrixAxes>
          <RfvMatrixTreemap
            layout={layout}
            containerRef={containerRef}
          />
        </RfvMatrixAxes>
      </Flex>

      <RfvMatrixLegend
        data={data}
        onCategoryToggle={onCategoryToggle}
        selectedCategories={selectedCategories}
      />
    </Stack>
  )
}

const RfvMatrix = memo(RfvMatrixBase) as typeof RfvMatrixBase

export { RfvMatrix }
