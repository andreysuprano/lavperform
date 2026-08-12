import {
  Badge,
  Card,
  Circle,
  HStack,
  Icon,
  IconButton,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import type { IconType } from 'react-icons'
import {
  LuBriefcase,
  LuCircle,
  LuFileText,
  LuGraduationCap,
  LuHeart,
  LuScale,
  LuSmile,
  LuWrench,
  LuZap,
} from 'react-icons/lu'
import { RiDeleteBinLine, RiRobot2Line } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import { DeleteConfirmationDialog } from '@/components'
import { useToggleAIAgent } from '@/whitelabel/hooks'
import type {
  CommunicationStyleType,
  VoiceToneType,
} from '@/whitelabel/types'

import type { Props } from './AIAgentListCard.types'

const voiceToneMeta: Record<
  VoiceToneType,
  { label: string; icon: IconType }
> = {
  FORMAL: { label: 'Formal', icon: LuBriefcase },
  FRIENDLY: { label: 'Amigável', icon: LuSmile },
  NEUTRAL: { label: 'Neutro', icon: LuCircle },
  EMPATHETIC: { label: 'Empático', icon: LuHeart },
  TECHNICAL: { label: 'Técnico', icon: LuWrench },
}

const communicationStyleMeta: Record<
  CommunicationStyleType,
  { label: string; icon: IconType }
> = {
  CONCISE: { label: 'Conciso', icon: LuZap },
  DETAILED: { label: 'Detalhado', icon: LuFileText },
  BALANCED: { label: 'Equilibrado', icon: LuScale },
  INSTRUCTIVE: { label: 'Instrutivo', icon: LuGraduationCap },
}

function AIAgentListCardBase({ agent, onDelete, isDeleting }: Props) {
  const toggleMutation = useToggleAIAgent()
  const navigate = useNavigate()

  const handleToggle = useCallback(() => {
    toggleMutation.mutate(agent.id)
  }, [toggleMutation, agent.id])

  const voiceTone = agent.persona?.voiceTone
    ? voiceToneMeta[agent.persona.voiceTone]
    : undefined
  const communicationStyle = agent.persona?.communicationStyle
    ? communicationStyleMeta[agent.persona.communicationStyle]
    : undefined

  return (
    <>
      <Card.Root
        transition="box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease"
        opacity={agent.active ? 1 : 0.75}
        _hover={{
          boxShadow: 'md',
          transform: 'translateY(-2px)',
          borderColor: 'primary.400',
        }}
        onClick={() => navigate(`/whitelabel/ai-agent/${agent.id}`)}
        cursor="pointer"
      >
        <Card.Header>
          <HStack justify="space-between" align="flex-start" gap={3}>
            {/* Avatar + nome + badge */}
            <HStack gap={3} flex={1} minW={0} overflow="hidden" align="center">
              <Circle
                size={10}
                bg={agent.active ? 'primary.500' : 'bg.muted'}
                color={agent.active ? 'primary.contrast' : 'fg.muted'}
                flexShrink={0}
              >
                <Icon as={RiRobot2Line} boxSize={5} />
              </Circle>
              <Stack gap={1} flex={1} minW={0}>
                <Text
                  fontSize="md"
                  fontWeight="semibold"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {agent.name}
                </Text>
                <Badge
                  colorPalette={agent.active ? 'green' : 'gray'}
                  variant="subtle"
                  size="sm"
                  alignSelf="flex-start"
                >
                  {agent.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </Stack>
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

        {(voiceTone || communicationStyle) && (
          <Card.Footer pt={0}>
            <HStack gap={2} flexWrap="wrap">
              {voiceTone && (
                <Badge variant="outline" size="sm" colorPalette="primary">
                  <Icon as={voiceTone.icon} boxSize={3.5} />
                  {voiceTone.label}
                </Badge>
              )}
              {communicationStyle && (
                <Badge variant="outline" size="sm" colorPalette="primary">
                  <Icon as={communicationStyle.icon} boxSize={3.5} />
                  {communicationStyle.label}
                </Badge>
              )}
            </HStack>
          </Card.Footer>
        )}
      </Card.Root>
    </>
  )
}

const AIAgentListCard = memo(AIAgentListCardBase) as typeof AIAgentListCardBase

export { AIAgentListCard, type Props as AIAgentListCardProps }
