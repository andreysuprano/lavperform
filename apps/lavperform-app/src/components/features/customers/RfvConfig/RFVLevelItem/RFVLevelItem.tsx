import { Badge, Flex, Input, Text } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'

import { useWhiteLabel } from '@/config'

import type { Props } from './RFVLevelItem.types'

function RFVLevelItemBase({ level, value, beforeInput, afterInput, step, onChange }: Props) {
  const { colorPalette } = useWhiteLabel()

  const valueString = useMemo(
    () => (value ?? '').toString(),
    [value]
  )

  const handleMinChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      const numericValue = value === '' ? null : Number(value)

      if (numericValue !== null && numericValue < 0) {
        return
      }

      onChange(numericValue)
    },
    [onChange]
  )

  return (
    <Flex
      alignItems="center"
      gap={3}
      px={3}
      py={2}
      borderWidth="1px"
      borderRadius="lg"
      bg="bg.surface"
    >
      <Badge
        borderRadius="lg"
        colorPalette={colorPalette}
        fontSize="md"
        px={4}
        py={3}
        fontWeight="bold"
      >
        {level}
      </Badge>

      <Flex alignItems="center" gap={2} flex="1">
        {typeof beforeInput === 'string' ? (
          <Text fontSize="sm">{beforeInput}</Text>
        ) : (
          beforeInput
        )}
        <Input
          value={valueString}
          onChange={handleMinChange}
          type="number"
          step={step}
          size="sm"
          width="64px"
          textAlign="center"
        />
        {typeof afterInput === 'string' ? (
          <Text fontSize="sm" color="fg.muted">
            {afterInput}
          </Text>
        ) : (
          afterInput
        )}
      </Flex>
    </Flex>
  )
}

const RFVLevelItem = memo(RFVLevelItemBase) as typeof RFVLevelItemBase

export { RFVLevelItem, type Props as RFVLevelItemProps }

