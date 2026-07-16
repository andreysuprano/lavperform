import { createListCollection, Fieldset, Stack, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { Input, Select, Textarea } from '@/components/forms'
import {
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
} from '@/whitelabel/constants/aiAgentPersonaDefaults'

import type { Props } from './AIAgentWizardStep2.types'

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

function AIAgentWizardStep2Base({ control, agentName }: Props) {
  const voiceToneCollection = useMemo(
    () => createListCollection({ items: voiceToneItems }),
    []
  )

  const communicationStyleCollection = useMemo(
    () => createListCollection({ items: communicationStyleItems }),
    []
  )

  return (
    <Stack gap={6}>
      <Fieldset.Root>
        <Fieldset.Legend>Persona</Fieldset.Legend>
        <Fieldset.HelperText>
          Defina a identidade e personalidade do seu agente.
        </Fieldset.HelperText>
        <Fieldset.Content>
          <Stack gap={4}>
            <Stack gap={1}>
              <Input
                control={control}
                name="personaName"
                label="Nome da persona"
                placeholder={agentName || 'Ex: Sofia'}
              />
              {agentName && (
                <Text fontSize="xs" color="fg.muted">
                  Sugestão: &quot;{agentName}&quot;
                </Text>
              )}
            </Stack>
            <Textarea
              control={control}
              name="systemPrompt"
              label="Inteligência do agente (System Prompt)"
              placeholder="Cole aqui o prompt customizado que define como o agente deve se comportar..."
              rows={8}
            />
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <Fieldset.Root>
        <Fieldset.Legend>Tom e estilo</Fieldset.Legend>
        <Fieldset.Content>
          <Stack gap={4}>
            <Select
              control={control}
              name="voiceTone"
              label="Tom de voz"
              placeholder="Selecione o tom de voz"
              collection={voiceToneCollection}
            />
            <Select
              control={control}
              name="communicationStyle"
              label="Estilo de comunicação"
              placeholder="Selecione o estilo"
              collection={communicationStyleCollection}
            />
            <Input
              control={control}
              name="language"
              label="Idioma"
              disabled
            />
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <Fieldset.Root>
        <Fieldset.Legend>Regras de comportamento</Fieldset.Legend>
        <Fieldset.HelperText>
          Comece com o padrão e personalize se necessário.
        </Fieldset.HelperText>
        <Fieldset.Content>
          <Stack gap={2}>
            <Textarea
              control={control}
              name="behaviorGuidelines"
              label=""
              rows={6}
            />
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <Fieldset.Root>
        <Fieldset.Legend>Guardrails</Fieldset.Legend>
        <Fieldset.HelperText>
          Comece com o padrão e personalize se necessário.
        </Fieldset.HelperText>
        <Fieldset.Content>
          <Stack gap={2}>
            <Textarea
              control={control}
              name="guardrails"
              label=""
              rows={6}
            />
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>
    </Stack>
  )
}

const AIAgentWizardStep2 = memo(
  AIAgentWizardStep2Base
) as typeof AIAgentWizardStep2Base

export {
  AIAgentWizardStep2,
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
  type Props as AIAgentWizardStep2Props,
}
