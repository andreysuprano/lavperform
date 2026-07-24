import { SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { RFV_SEGMENT_CATEGORIES } from '@/utils/constants/rfvMatrix'
import type { RfvMatrixData } from '@/types'
import type { RfvSegmentCategory } from '@/utils/constants/rfvMatrix/categories'

import { RfvMatrixLegendCategory } from './RfvMatrixLegendCategory'

interface Props {
  data: RfvMatrixData | undefined
  selectedCategories?: RfvSegmentCategory[]
  onCategoryToggle?: (categoryId: RfvSegmentCategory) => void
}

function RfvMatrixLegendBase({
  data,
  selectedCategories,
  onCategoryToggle,
}: Props) {
  return (
    <Stack
      gap={4}
      px={{ base: 4, md: 0 }}
      w="full"
    >
      <Text
        fontSize={{ base: 'sm', md: 'md' }}
        fontWeight="semibold"
      >
        Legenda de Segmentos:
      </Text>
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 2, xl: 3, '2xl': 5 }}
        gap={4}
      >
        {RFV_SEGMENT_CATEGORIES.map((category) => (
          <RfvMatrixLegendCategory
            key={category.id}
            category={category}
            data={data}
            isSelected={selectedCategories?.includes(category.id) ?? false}
            onToggle={onCategoryToggle}
          />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

const RfvMatrixLegend = memo(RfvMatrixLegendBase) as typeof RfvMatrixLegendBase

export { RfvMatrixLegend }
