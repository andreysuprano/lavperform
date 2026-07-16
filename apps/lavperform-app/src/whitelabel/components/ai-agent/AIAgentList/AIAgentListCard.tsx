import {
  Badge,
  Card,
  HStack,
  IconButton,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useState } from 'react'
import { RiDeleteBinLine } from 'react-icons/ri'

import { DeleteConfirmationDialog } from '@/components'
import { useToggleAIAgent } from '@/whitelabel/hooks'

import { AIAgentEditDrawer } from '../AIAgentEditDrawer'
import type { Props } from './AIAgentListCard.types'

function AIAgentListCardBase({ agent, onDelete, isDeleting }: Props) {
  const toggleMutation = useToggleAIAgent()
  const [isEditOpen, setIsEditOpen] = useState(false)

  const handleToggle = useCallback(() => {
    toggleMutation.mutate(agent.id)
  }, [toggleMutation, agent.id])

  return (
    <>
      <Card.Root
        transition="box-shadow 0.2s ease, transform 0.2s ease"
        opacity={agent.active ? 1 : 0.75}
        _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
        onClick={() => setIsEditOpen(true)}
        cursor="pointer"  
      >
        <Card.Header>
          <HStack justify="space-between" align="flex-start" gap={3}>
            {/* Nome + badge inline */}
            <HStack gap={2} flex={1} minW={0} overflow="hidden" align="center">
              <Text
                fontSize="md"
                fontWeight="semibold"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                flexShrink={1}
              >
                {agent.name}
              </Text>
              <Badge
                colorPalette={agent.active ? 'green' : 'gray'}
                variant="subtle"
                flexShrink={0}
              >
                {agent.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </HStack>

            {/* Ações */}
            <HStack gap={1} flexShrink={0} align="center">
              <Switch.Root
                checked={agent.active}
                onCheckedChange={handleToggle}
                disabled={toggleMutation.isPending}
                size="md"
                onClick={(e) => e.stopPropagation()}
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>

              <DeleteConfirmationDialog
                title="Excluir agente de IA"
                description={`Tem certeza que deseja excluir o agente "${agent.name}"? Esta ação não pode ser desfeita.`}
                isLoading={isDeleting || false}
                onClick={() => onDelete(agent)}
                trigger={
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    aria-label="Excluir agente"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RiDeleteBinLine />
                  </IconButton>
                }
              />
            </HStack>
          </HStack>
        </Card.Header>

        {agent.description && (
          <Card.Body pt={0}>
            <Text
              fontSize="sm"
              color="fg.muted"
              overflow="hidden"
              css={{
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                display: '-webkit-box',
              }}
            >
              {agent.description}
            </Text>
          </Card.Body>
        )}

        {(agent.persona?.voiceTone || agent.persona?.communicationStyle) && (
          <Card.Footer pt={0}>
            <HStack gap={2} flexWrap="wrap">
              {agent.persona.voiceTone && (
                <Badge variant="outline" size="sm">
                  {agent.persona.voiceTone}
                </Badge>
              )}
              {agent.persona.communicationStyle && (
                <Badge variant="outline" size="sm">
                  {agent.persona.communicationStyle}
                </Badge>
              )}
            </HStack>
          </Card.Footer>
        )}
      </Card.Root>

      {isEditOpen && (
        <AIAgentEditDrawer
          agent={agent}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  )
}

const AIAgentListCard = memo(AIAgentListCardBase) as typeof AIAgentListCardBase

export { AIAgentListCard, type Props as AIAgentListCardProps }
