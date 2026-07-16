import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { useWhiteLabel } from '@/config'
import type { RfvMatrixData, RfvSegmentCategoryInfo } from '@/types'
import type { RfvSegmentCategory } from '@/utils/constants/rfvMatrix/categories'
import {
  RFV_SEGMENT_COLORS,
  RFV_SEGMENT_DESCRIPTIONS,
  RFV_SEGMENT_POSITIONS,
} from '@/utils/constants/rfvMatrix'

interface Props {
  category: RfvSegmentCategoryInfo
  data: RfvMatrixData | undefined
  isSelected?: boolean
  onToggle?: (categoryId: RfvSegmentCategory) => void
}

function RfvMatrixLegendCategoryBase({
  category,
  data,
  isSelected = false,
  onToggle,
}: Props) {
  const { colors } = useWhiteLabel()
  const categorySegments = category.segments
    .map((segmentKey) => {
      const position = RFV_SEGMENT_POSITIONS.find((p) => p.key === segmentKey)
      const segmentData = data?.[segmentKey]
      if (!position) return null

      return {
        key: segmentKey,
        label: position.label,
        color: RFV_SEGMENT_COLORS[segmentKey],
        description: RFV_SEGMENT_DESCRIPTIONS[segmentKey],
        count: segmentData?.count || 0,
        percentage: segmentData?.percentage || 0,
      }
    })
    .filter(
      (segment): segment is NonNullable<typeof segment> => segment !== null
    )

  if (categorySegments.length === 0) return null

  const categoryColorMap: Record<string, string> = {
    positivos: 'yellow.500',
    neutros: 'gray.400',
    atencao: 'orange.400',
    criticos: 'red.500',
  }
  const categoryColor = categoryColorMap[category.id] || 'gray.400'

  return (
    <Box
      bg="bg"
      borderColor={isSelected ? colors.primary : 'border'}
      borderRadius="md"
      borderTopWidth="3px"
      borderTopColor={isSelected ? colors.primary : categoryColor}
      borderWidth={isSelected ? '2px' : '1px'}
      cursor={onToggle ? 'pointer' : 'default'}
      p={4}
      position="relative"
      shadow={isSelected ? 'md' : 'sm'}
      transform={isSelected ? 'scale(1.02)' : 'scale(1)'}
      transition="all 0.2s"
      userSelect="none"
      onClick={
        onToggle ? () => onToggle(category.id as RfvSegmentCategory) : undefined
      }
      _hover={{
        shadow: 'md',
        transform: isSelected ? 'scale(1.02)' : 'translateY(-2px)',
        borderColor: onToggle ? colors.primary : 'border',
      }}
    >
      <Stack gap={3}>
        <Flex
          alignItems="center"
          gap={2}
        >
          <Box
            bg={categoryColor}
            borderRadius="full"
            h={2}
            w={2}
          />
          <Text
            fontSize={{ base: 'xs', md: 'sm' }}
            fontWeight="bold"
          >
            {category.label}
          </Text>
        </Flex>
        <Stack gap={3}>
          {categorySegments.map((segment, index) => (
            <Box key={segment.key}>
              {index > 0 && (
                <Box
                  borderColor="border.subtle"
                  borderTopWidth="1px"
                  mb={3}
                />
              )}
              <Flex
                alignItems="flex-start"
                gap={3}
              >
                <Box
                  bg={segment.color}
                  borderRadius="md"
                  flexShrink={0}
                  h={5}
                  mt={0.5}
                  shadow="sm"
                  w={5}
                />
                <Stack
                  flex={1}
                  gap={1}
                >
                  <Text
                    fontSize={{ base: '2xs', md: 'xs' }}
                    fontWeight="semibold"
                  >
                    {segment.label}
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize={{ base: '2xs', md: 'xs' }}
                    lineHeight="shorter"
                  >
                    {segment.description}
                  </Text>
                </Stack>
              </Flex>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}

const RfvMatrixLegendCategory = memo(
  RfvMatrixLegendCategoryBase
) as typeof RfvMatrixLegendCategoryBase

export { RfvMatrixLegendCategory }
