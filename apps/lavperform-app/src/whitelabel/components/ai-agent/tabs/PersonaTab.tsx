import { Button, Card, Stack, createListCollection } from '@chakra-ui/react'
import { memo, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { Input, Select, Textarea } from '@/components/forms'
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

const voiceToneItems = [
  { value: 'FORMAL', label: 'Formal' },
  { value: 'FRIENDLY', label: 'Amigável' },
  { value: 'NEUTRAL', label: 'Neutro' },
  { value: 'EMPATHETIC', label: 'Empático' },
  { value: 'TECHNICAL', label: 'Técnico' },
]

const communicationStyleItems = [
  { value: 'CONCISE', label: 'Conciso' },
  { value: 'DETAILED', label: 'Detalhado' },
  { value: 'BALANCED', label: 'Equilibrado' },
  { value: 'INSTRUCTIVE', label: 'Instrutivo' },
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

  const voiceToneCollection = useMemo(
    () => createListCollection({ items: voiceToneItems }),
    []
  )
  const communicationStyleCollection = useMemo(
    () => createListCollection({ items: communicationStyleItems }),
    []
  )

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
        <Stack gap={4}>
          <Input
            control={form.control}
            name="personaName"
            label="Nome da persona"
            placeholder="Ex: Sofia"
          />
          <Textarea
            control={form.control}
            name="systemPrompt"
            label="Inteligência do agente (System Prompt)"
            placeholder="Cole aqui o prompt customizado..."
            rows={8}
          />
          <Select
            control={form.control}
            name="voiceTone"
            label="Tom de voz"
            placeholder="Selecione o tom de voz"
            collection={voiceToneCollection}
          />
          <Select
            control={form.control}
            name="communicationStyle"
            label="Estilo de comunicação"
            placeholder="Selecione o estilo"
            collection={communicationStyleCollection}
          />
          <Textarea
            control={form.control}
            name="behaviorGuidelines"
            label="Regras de comportamento"
            rows={6}
          />
          <Textarea
            control={form.control}
            name="guardrails"
            label="Guardrails"
            rows={6}
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
