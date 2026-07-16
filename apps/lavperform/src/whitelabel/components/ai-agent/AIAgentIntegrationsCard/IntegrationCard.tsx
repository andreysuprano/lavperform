import { Badge, Box, Card, HStack, Icon, Stack, Switch, Text } from '@chakra-ui/react'
import { memo } from 'react'

interface Props {
  icon: any
  name: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  status?: 'active' | 'coming-soon'
}

function IntegrationCardBase({
  icon,
  name,
  enabled,
  onToggle,
  status = 'active',
}: Props) {
  return (
    <Card.Root
      borderColor={enabled ? 'green.500' : 'border.emphasized'}
      borderWidth={enabled ? '2px' : '1px'}
    >
      <Card.Body>
        <HStack
          justify="space-between"
          gap={3}
          align="center"
        >
          <HStack gap={3} align="center">
            <Icon
              as={icon}
              boxSize={6}
              color={enabled ? 'primary.500' : 'fg.muted'}
            />
            <Stack gap={0.5}>
              <Text
                fontSize="md"
                fontWeight="semibold"
              >
                {name}
              </Text>
              {status === 'coming-soon' && (
                <Badge
                  colorPalette="gray"
                  variant="subtle"
                  size="sm"
                >
                  Em breve
                </Badge>
              )}
            </Stack>
          </HStack>
          <Switch.Root
            checked={enabled}
            disabled={status === 'coming-soon'}
            onCheckedChange={({ checked }) => onToggle(checked)}
            size="md"
          >
            <Switch.HiddenInput />
            <Switch.Control />
          </Switch.Root>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

export const IntegrationCard = memo(IntegrationCardBase)
