import { Button, Card, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { ComponentType } from 'react'
import { memo, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
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

import { Input } from '@/components/forms'
import {
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
} from '@/whitelabel/constants/aiAgentPersonaDefaults'
import { useUpdateAIAgentPersona } from '@/whitelabel/hooks'
import type {
  AIAgent,
  CommunicationStyleType,
  VoiceToneType,
} from '@/whitelabel/types'

import { MarkdownField } from './MarkdownField'
import { SelectableIconCard } from './SelectableIconCard'

interface CardOption<T> {
  value: T
  title: string
  description: string
  icon: ComponentType
}

const voiceToneOptions: CardOption<VoiceToneType>[] = [
  {
    value: 'FORMAL',
    title: 'Formal',
    description: 'Linguagem profissional e polida.',
    icon: LuBriefcase,
  },
  {
    value: 'FRIENDLY',
    title: 'Amigável',
    description: 'Próximo, caloroso e descontraído.',
    icon: LuSmile,
  },
  {
    value: 'NEUTRAL',
    title: 'Neutro',
    description: 'Equilibrado e imparcial.',
    icon: LuCircle,
  },
  {
    value: 'EMPATHETIC',
    title: 'Empático',
    description: 'Acolhedor e atento às emoções.',
    icon: LuHeart,
  },
  {
    value: 'TECHNICAL',
    title: 'Técnico',
    description: 'Preciso e focado em detalhes.',
    icon: LuWrench,
  },
]

const communicationStyleOptions: CardOption<CommunicationStyleType>[] = [
  {
    value: 'CONCISE',
    title: 'Conciso',
    description: 'Respostas curtas e diretas.',
    icon: LuZap,
  },
  {
    value: 'DETAILED',
    title: 'Detalhado',
    description: 'Explicações completas e aprofundadas.',
    icon: LuFileText,
  },
  {
    value: 'BALANCED',
    title: 'Equilibrado',
    description: 'Mistura clareza e profundidade.',
    icon: LuScale,
  },
  {
    value: 'INSTRUCTIVE',
    title: 'Instrutivo',
    description: 'Guia passo a passo, didático.',
    icon: LuGraduationCap,
  },
]

interface PersonaFormData {
  personaName: string
  systemPrompt: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
  behaviorGuidelines: string
  guardrails: string
}

interface PersonaTabProps {
  agent: AIAgent
}

function PersonaTabBase({ agent }: PersonaTabProps) {
  const updatePersona = useUpdateAIAgentPersona()

  const form = useForm<PersonaFormData>({
    defaultValues: {
      personaName: agent.persona?.personaName || '',
      systemPrompt: agent.persona?.systemPrompt || '',
      voiceTone: agent.persona?.voiceTone || 'FORMAL',
      communicationStyle: agent.persona?.communicationStyle || 'BALANCED',
      behaviorGuidelines:
        agent.persona?.behaviorGuidelines || DEFAULT_BEHAVIOR_GUIDELINES,
      guardrails: agent.persona?.guardrails || DEFAULT_GUARDRAILS,
    },
  })

  useEffect(() => {
    form.reset({
      personaName: agent.persona?.personaName || '',
      systemPrompt: agent.persona?.systemPrompt || '',
      voiceTone: agent.persona?.voiceTone || 'FORMAL',
      communicationStyle: agent.persona?.communicationStyle || 'BALANCED',
      behaviorGuidelines:
        agent.persona?.behaviorGuidelines || DEFAULT_BEHAVIOR_GUIDELINES,
      guardrails: agent.persona?.guardrails || DEFAULT_GUARDRAILS,
    })
  }, [agent, form])

  const handleSave = form.handleSubmit(async (values) => {
    await updatePersona.mutateAsync({
      agentId: agent.id,
      data: {
        personaName: values.personaName || undefined,
        systemPrompt: values.systemPrompt || undefined,
        voiceTone: values.voiceTone,
        communicationStyle: values.communicationStyle,
        behaviorGuidelines: values.behaviorGuidelines || undefined,
        guardrails: values.guardrails || undefined,
        language: 'PT_BR',
      },
    })
  })

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>Persona e inteligência</Card.Title>
        <Card.Description>
          Defina a identidade, o tom de voz e as regras de comportamento do
          agente.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={6}>
          <Input
            control={form.control}
            name="personaName"
            label="Nome da persona"
            placeholder="Ex: Sofia"
          />

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Controller
              control={form.control}
              name="voiceTone"
              render={({ field }) => (
                <Stack gap={3}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Tom de voz
                  </Text>
                  <Stack gap={2}>
                    {voiceToneOptions.map((option) => (
                      <SelectableIconCard
                        key={option.value}
                        icon={option.icon}
                        title={option.title}
                        description={option.description}
                        selected={field.value === option.value}
                        onClick={() => field.onChange(option.value)}
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
            />

            <Controller
              control={form.control}
              name="communicationStyle"
              render={({ field }) => (
                <Stack gap={3}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Estilo de comunicação
                  </Text>
                  <Stack gap={2}>
                    {communicationStyleOptions.map((option) => (
                      <SelectableIconCard
                        key={option.value}
                        icon={option.icon}
                        title={option.title}
                        description={option.description}
                        selected={field.value === option.value}
                        onClick={() => field.onChange(option.value)}
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
            />
          </SimpleGrid>

          <Controller
            control={form.control}
            name="systemPrompt"
            render={({ field }) => (
              <MarkdownField
                label="Inteligência do agente (System Prompt)"
                value={field.value}
                onChange={field.onChange}
                placeholder="Cole aqui o prompt customizado..."
                height={320}
              />
            )}
          />

          <Controller
            control={form.control}
            name="behaviorGuidelines"
            render={({ field }) => (
              <MarkdownField
                label="Regras de comportamento"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={form.control}
            name="guardrails"
            render={({ field }) => (
              <MarkdownField
                label="Guardrails"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Stack>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Button size="sm" onClick={handleSave} loading={updatePersona.isPending}>
          Salvar persona
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}

const PersonaTab = memo(PersonaTabBase) as typeof PersonaTabBase

export { PersonaTab }
