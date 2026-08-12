import { Box, Circle, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { memo, type ComponentType } from 'react'
import { RiCheckLine } from 'react-icons/ri'

interface SelectableIconCardProps {
  icon: ComponentType
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

function SelectableIconCardBase({
  icon,
  title,
  description,
  selected,
  onClick,
}: SelectableIconCardProps) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      py={3}
      px={3}
      borderRadius="lg"
      borderWidth="2px"
      borderColor={selected ? 'primary.500' : 'border.emphasized'}
      bg={selected ? 'primary.50' : 'bg'}
      _hover={{
        borderColor: 'primary.400',
        bg: selected ? 'primary.50' : 'bg.muted',
      }}
      transition="all 0.2s"
      cursor="pointer"
      w="full"
      textAlign="left"
    >
      <HStack gap={3} align="center">
        <Circle
          size={9}
          bg={selected ? 'primary.500' : 'bg.muted'}
          color={selected ? 'primary.contrast' : 'fg.muted'}
          flexShrink={0}
        >
          <Icon as={icon} boxSize={5} />
        </Circle>
        <Stack gap={0} flex={1} minW={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {title}
          </Text>
          <Text color="fg.muted" fontSize="xs" lineClamp={2}>
            {description}
          </Text>
        </Stack>
        {selected && (
          <Circle size={5} bg="primary.500" color="primary.contrast" flexShrink={0}>
            <Icon as={RiCheckLine} boxSize={3.5} />
          </Circle>
        )}
      </HStack>
    </Box>
  )
}

const SelectableIconCard = memo(SelectableIconCardBase)

export { SelectableIconCard, type SelectableIconCardProps }
