import { Box, HStack, Text } from '@chakra-ui/react'

import { useWhiteLabel } from '@/config'
import { WEEKDAYS } from '@/utils/weekdays'

import { Props } from './DisplaySelectedWeekday.types'

function DisplaySelectedWeekday({
  displayItems,
  label,
  isCompact = false,
}: Props) {
  const { colorPalette } = useWhiteLabel()

  const activeLabelsSet = new Set(
    displayItems.map((item) => item.toUpperCase())
  )

  const badgeSize = isCompact ? '35px' : '50px'
  const labelFontSize = isCompact ? 'xs' : 'sm'
  const titleFontSize = isCompact ? 'sm' : 'sm'
  const stackSpacing = isCompact ? 1.5 : 3
  const justify = isCompact ? 'center' : 'flex-start'

  const styles = {
    active: {
      bg: `${colorPalette}.300`,
      color: 'gray.800',
      borderColor: `${colorPalette}.400`,
      fontWeight: 'bold',
      boxShadow: 'sm',
    },
    inactive: {
      bg: 'white',
      color: 'gray.600',
      borderColor: 'gray.300',
      fontWeight: 'semibold',
      boxShadow: 'none',
    },
    common: {
      width: badgeSize,
      height: badgeSize,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'md',
      border: '1px solid',
      transition: 'all 0.2s',
      cursor: 'default',
    },
  }

  const hasActiveDays = activeLabelsSet.size > 0
  if (isCompact && !hasActiveDays) {
    return null
  }

  return (
    <Box w="full">
      {!isCompact && (
        <Text
          fontSize={titleFontSize}
          fontWeight="semibold"
          mb={3}
        >
          {label || 'Disponibilidade Semanal'}
        </Text>
      )}
      <HStack
        gap={stackSpacing}
        justifyContent={justify}
        wrap="wrap"
      >
        {WEEKDAYS.map((day) => {
          const isActive = activeLabelsSet.has(day.label)
          const currentStyles = isActive ? styles.active : styles.inactive

          return (
            <Box
              key={day.value}
              {...styles.common}
              {...currentStyles}
              bg={currentStyles.bg}
              borderColor={currentStyles.borderColor}
              color={currentStyles.color}
            >
              <Text
                fontSize={labelFontSize}
                fontWeight={currentStyles.fontWeight}
              >
                {day.label}
              </Text>
            </Box>
          )
        })}
        {!hasActiveDays && !isCompact && (
          <Text
            color="gray.500"
            fontSize="sm"
            mt={2}
            w="full"
          >
            Horário não definido.
          </Text>
        )}
      </HStack>
    </Box>
  )
}

export { DisplaySelectedWeekday, type Props as DisplaySelectedWeekdayProps }
