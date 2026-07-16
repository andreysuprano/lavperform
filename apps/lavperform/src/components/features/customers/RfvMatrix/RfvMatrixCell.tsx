import { Box, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { RFV_SEGMENT_DESCRIPTIONS } from '@/utils/constants/rfvMatrix'

import type { CellProps } from './RfvMatrix.types'

const MIN_PERCENTAGE_FOR_LABEL = 3
const MIN_WIDTH_FOR_LABEL = 80
const MIN_HEIGHT_FOR_LABEL = 60

function RfvMatrixCellBase({
  label,
  count,
  percentage,
  x,
  y,
  width,
  height,
  color,
  segmentKey,
  zIndex,
}: CellProps) {
  const isDark =
    color.includes('gray.6') ||
    color.includes('gray.7') ||
    color.includes('red.4') ||
    color.includes('red.6') ||
    color.includes('orange.7')

  const shouldShowLabel =
    count >= 0 ||
    (percentage >= MIN_PERCENTAGE_FOR_LABEL &&
      width >= MIN_WIDTH_FOR_LABEL &&
      height >= MIN_HEIGHT_FOR_LABEL)

  const description = RFV_SEGMENT_DESCRIPTIONS[segmentKey] || ''
  const tooltipContent = (
    <Stack gap={2}>
      <Text
        fontWeight="bold"
        fontSize="sm"
      >
        {label}
      </Text>
      {description && (
        <Text
          fontSize="xs"
          color="fg.inverted"
        >
          {description}
        </Text>
      )}
      <Box
        borderTopWidth="1px"
        borderColor="border.subtle"
        pt={2}
        mt={1}
      />
      <Stack gap={1}>
        <Text fontSize="xs">
          <strong>Quantidade:</strong> {count} clientes
        </Text>
        <Text fontSize="xs">
          <strong>Participação:</strong> {percentage.toFixed(1)}% da base total
        </Text>
      </Stack>
    </Stack>
  )

  const isNearTop = y < 5
  const paddingTop = shouldShowLabel && isNearTop ? 2 : shouldShowLabel ? 2 : 0
  const paddingBottom = shouldShowLabel ? 0 : 0
  const paddingX = shouldShowLabel ? 3 : 0

  return (
    <Tooltip
      content={tooltipContent}
      openDelay={200}
      closeDelay={100}
    >
      <Box
        bg={color}
        cursor="pointer"
        h={`${height}px`}
        left={`${x}px`}
        pb={paddingBottom}
        pl={paddingX}
        pr={paddingX}
        pt={paddingTop}
        position="absolute"
        style={{ zIndex: zIndex ?? 1 }}
        top={`${y}px`}
        transition="all 0.2s"
        w={`${width}px`}
        _hover={{
          zIndex: 5,
        }}
      >
        {shouldShowLabel ? (
          <Stack
            h="full"
            justifyContent="center"
            gap={0}
          >
            <Text
              fontSize={{ base: '2xs', md: 'xs' }}
              fontWeight="medium"
              lineClamp={2}
              color={isDark ? 'white' : 'gray.800'}
            >
              {label}
            </Text>
            <Text
              fontSize={{ base: 'md', md: 'lg' }}
              fontWeight="bold"
              color={isDark ? 'white' : 'gray.900'}
            >
              {count}
            </Text>
            <Text
              fontSize={{ base: '3xs', md: '2xs' }}
              color={isDark ? 'gray.200' : 'gray.600'}
            >
              {percentage.toFixed(1)}%
            </Text>
          </Stack>
        ) : (
          <Box h="full" w="full" />
        )}
      </Box>
    </Tooltip>
  )
}

const RfvMatrixCell = memo(RfvMatrixCellBase) as typeof RfvMatrixCellBase

export { RfvMatrixCell }
