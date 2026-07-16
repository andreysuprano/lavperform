import { Badge, Grid, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { useWhiteLabel } from '@/config'
import { useCustomerSummary } from '@/context/CustomerSummaryContext'

interface Props {
  selectedSegmentations?: string[]
  onSegmentationToggle?: (segmentation: string) => void
}

const CustomerSummaryWidgetComponent = ({
  selectedSegmentations,
  onSegmentationToggle,
}: Props) => {
  const { colors } = useWhiteLabel()
  const { customersSummary } = useCustomerSummary()

  if (customersSummary.length === 0) {
    return null
  }

  return (
    <Grid
      gap={2}
      templateColumns={{
        base: '1fr',
        sm: 'repeat(2, 1fr)',
        md: 'repeat(3, 1fr)',
        lg: 'repeat(4, 1fr)',
        xl: 'repeat(6, 1fr)',
        '2xl': 'repeat(8, 1fr)',
      }}
    >
      {customersSummary.map((card, idx) => {
        const isSelected =
          selectedSegmentations?.includes(card.segmentation) ?? false
        return (
          <Badge
            as="div"
            bg={card.count ? 'bg' : 'bg.emphasized'}
            borderColor={isSelected ? colors.primary : undefined}
            borderWidth={isSelected ? '2px' : undefined}
            colorPalette={'gray'}
            cursor={onSegmentationToggle ? 'pointer' : 'default'}
            justifyContent={'space-between'}
            key={idx}
            opacity={card.count ? 1 : 0.6}
            px={3}
            py={2}
            transform={isSelected ? 'scale(1.02)' : 'scale(1)'}
            transition="all 0.15s"
            userSelect="none"
            variant="outline"
            onClick={
              onSegmentationToggle && card.count
                ? () => onSegmentationToggle(card.segmentation)
                : undefined
            }
            _hover={
              onSegmentationToggle && card.count
                ? {
                    borderColor: colors.primary,
                    transform: isSelected ? 'scale(1.02)' : 'scale(1.01)',
                  }
                : undefined
            }
          >
            <Text
              as="span"
              fontWeight="bold"
            >
              {card.icon} {card.label}
            </Text>
            <Text as="span">{card.count}</Text>
          </Badge>
        )
      })}
    </Grid>
  )
}

export const CustomerSummaryWidget = memo(CustomerSummaryWidgetComponent)
