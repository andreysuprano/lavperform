import { Badge, Card, Flex, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './ChannelCard.types'

const HOVER_STYLES = { boxShadow: 'md', borderColor: 'border.emphasized' }

function ChannelCardBase({
  name,
  icon: Icon,
  description,
  badgeLabel,
  badgeColorPalette = 'green',
  action,
  isAvailable = false,
}: Props) {
  return (
    <Card.Root
      h="full"
      transition="box-shadow 0.2s"
      _hover={isAvailable ? HOVER_STYLES : undefined}
    >
      <Card.Body
        as={Stack}
        gap={3}
        justifyContent="space-between"
        p={5}
      >
        <Stack gap={3}>
          {badgeLabel && (
            <Badge
              colorPalette={badgeColorPalette}
              size="sm"
              w="fit-content"
            >
              {badgeLabel}
            </Badge>
          )}
          <Flex
            align="center"
            gap={2}
          >
            <Text fontSize="xl">
              <Icon />
            </Text>
            <Text
              fontWeight="semibold"
              fontSize="sm"
            >
              {name}
            </Text>
          </Flex>
          <Text
            color="fg.muted"
            fontSize="sm"
            lineHeight="tall"
          >
            {description}
          </Text>
        </Stack>
        <Flex mt={2}>{action}</Flex>
      </Card.Body>
    </Card.Root>
  )
}

const ChannelCard = memo(ChannelCardBase) as typeof ChannelCardBase

export { ChannelCard, type Props as ChannelCardProps }
