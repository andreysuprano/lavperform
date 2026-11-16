import { Badge, Grid, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { shellDark } from '@/components/layout/AppLayout/shellPalette'
import { useShellMode } from '@/components/layout/AppLayout/useShellMode'
import { useColorModeValue } from '@/components/ui/color-mode'
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
  const phone = useShellMode() === 'phone'
  const phoneCard = useColorModeValue('white', shellDark.card)

  if (customersSummary.length === 0) {
    return null
  }

  return (
    <Grid
      gap={2}
      templateColumns={{
        base: 'repeat(2, 1fr)',
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
            _hover={
              onSegmentationToggle && card.count
                ? {
                    borderColor: colors.primary,
                    bg: 'bg.subtle',
                  }
                : undefined
            }
            as="div"
            bg={phone ? phoneCard : card.count ? 'bg.panel' : 'bg.muted'}
            borderColor={isSelected ? colors.primary : 'border'}
            borderWidth="1px"
            colorPalette="gray"
            cursor={onSegmentationToggle ? 'pointer' : 'default'}
            justifyContent="space-between"
            key={idx}
            onClick={
              onSegmentationToggle && card.count
                ? () => onSegmentationToggle(card.segmentation)
                : undefined
            }
            opacity={card.count ? 1 : 0.55}
            px={3}
            py={2}
            transition="border-color 0.15s ease, background 0.15s ease"
            userSelect="none"
            variant="outline"
          >
            <Text
              as="span"
              color="fg"
              fontSize="xs"
              fontWeight="medium"
            >
              {card.icon} {card.label}
            </Text>
            <Text
              as="span"
              color="fg"
              fontSize="sm"
              fontVariantNumeric="tabular-nums"
              fontWeight="bold"
            >
              {card.count}
            </Text>
          </Badge>
        )
      })}
    </Grid>
  )
}

export const CustomerSummaryWidget = memo(CustomerSummaryWidgetComponent)
