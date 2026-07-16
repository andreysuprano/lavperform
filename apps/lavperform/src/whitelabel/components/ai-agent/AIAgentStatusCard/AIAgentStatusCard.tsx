import { Card, HStack, Icon, Stack, Switch, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuBotMessageSquare } from 'react-icons/lu'

import { Tooltip } from '@/components'

import { Props } from './AIAgentStatusCard.types'

function AIAgentStatusCardBase({ enabled, onToggle }: Props) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack
          justify="space-between"
          gap={4}
        >
          <HStack gap={4}>
            <Icon
              as={LuBotMessageSquare}
              boxSize={10}
              color={enabled ? 'primary.500' : 'fg.muted'}
            />
            <Stack gap={0}>
              <Text
                fontSize="lg"
                fontWeight="bold"
              >
                Agente de IA
              </Text>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Responde automaticamente seus clientes
              </Text>
            </Stack>
          </HStack>
          <Tooltip
            content={
              enabled
                ? 'Desative para pausar o agente'
                : 'Ative o agente para começar a responder clientes'
            }
            positioning={{ placement: 'top' }}
          >
            <Switch.Root
              checked={enabled}
              onCheckedChange={({ checked }) => onToggle(checked)}
              size="lg"
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </Tooltip>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

const AIAgentStatusCard = memo(AIAgentStatusCardBase) as typeof AIAgentStatusCardBase

export { AIAgentStatusCard, type Props as AIAgentStatusCardProps }
