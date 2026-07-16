import { Badge, Box, Checkbox, HStack, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

interface Props {
  title: string
  description: string
  selected: boolean
  onClick: () => void
  badge?: string
}

function SelectableCardBase({
  title,
  description,
  selected,
  onClick,
  badge,
}: Props) {
  return (
    <Box
      as="button"
      onClick={onClick}
      py={2.5}
      px={3}
      borderRadius="md"
      borderWidth="2px"
      borderColor={selected ? 'primary.500' : 'border.emphasized'}
      bg={selected ? 'primary.50' : 'bg'}
      _hover={{
        borderColor: 'primary.400',
        bg: selected ? 'primary.50' : 'bg.muted',
      }}
      transition="all 0.2s"
      position="relative"
      cursor="pointer"
      w="full"
      textAlign="left"
    >
      <Stack gap={1}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Text
              fontWeight="bold"
              fontSize="md"
            >
              {title}
            </Text>
            {badge && (
              <Badge
                colorPalette="primary"
                variant="subtle"
                size="sm"
              >
                {badge}
              </Badge>
            )}
          </HStack>
          {selected && (
            <Checkbox.Root checked>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
            </Checkbox.Root>
          )}
        </HStack>
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          {description}
        </Text>
      </Stack>
    </Box>
  )
}

export const SelectableCard = memo(SelectableCardBase)
