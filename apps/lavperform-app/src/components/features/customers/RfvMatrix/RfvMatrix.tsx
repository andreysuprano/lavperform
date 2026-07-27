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

  const { hasRfvData, hasAnyData } = useMemo(() => {
    if (!data) return { hasRfvData: false, hasAnyData: false }

    const rfvTotalCount = RFV_SEGMENT_POSITIONS.reduce((sum, position) => {
      const segmentData = data[position.key]
      return sum + (segmentData?.count || 0)
    }, 0)

    const leadCount = data.lead?.count || 0

    return {
      hasRfvData: rfvTotalCount > 0,
      hasAnyData: rfvTotalCount > 0 || leadCount > 0,
    }
  }, [data])

  if (isLoading) return <LoadingState title="Carregando Matriz RFV..." />
  if (!hasAnyData) {
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

      {hasRfvData ? (
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
      ) : (
        <Empty
          description="Ainda não há clientes com vendas para exibir a matriz RFV. Os leads cadastrados aparecem na legenda abaixo."
          title="Matriz RFV sem dados de vendas"
        />
      )}

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
