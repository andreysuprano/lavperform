import {
  Button,
  Card,
  Field,
  Fieldset,
  HStack,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useUpdateAIAgentFilterConfig } from '@/whitelabel/hooks'
import type { AIAgent } from '@/whitelabel/types'

import { TagsInput } from './TagsInput'

interface FilterFormData {
  allowedPhones: string[]
  allowedGroups: string[]
  triggerEnabled: boolean
  triggerWords: string[]
  triggerCaseSensitive: boolean
  triggerRemoveFromText: boolean
}

function buildFilterForm(agent: AIAgent): FilterFormData {
  const fc = agent.filterConfig
  return {
    allowedPhones: fc?.allowedPhones ?? [],
    allowedGroups: fc?.allowedGroups ?? [],
    triggerEnabled: fc?.triggerEnabled ?? false,
    triggerWords: fc?.triggerWords ?? [],
    triggerCaseSensitive: fc?.triggerCaseSensitive ?? false,
    triggerRemoveFromText: fc?.triggerRemoveFromText ?? false,
  }
}

interface SwitchFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SwitchField({ label, description, checked, onChange }: SwitchFieldProps) {
  return (
    <HStack justify="space-between" align="flex-start">
      <Stack gap={0.5}>
        <Text fontSize="sm" fontWeight="medium">
          {label}
        </Text>
        {description && (
          <Text fontSize="xs" color="fg.muted">
            {description}
          </Text>
        )}
      </Stack>
      <Switch.Root
        checked={checked}
        onCheckedChange={(e) => onChange(e.checked)}
        size="md"
      >
        <Switch.HiddenInput />
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Root>
    </HStack>
  )
}

interface FiltersTabProps {
  agent: AIAgent
}

function FiltersTabBase({ agent }: FiltersTabProps) {
  const updateFilterConfig = useUpdateAIAgentFilterConfig()

  const form = useForm<FilterFormData>({
    defaultValues: buildFilterForm(agent),
  })

  useEffect(() => {
    form.reset(buildFilterForm(agent))
  }, [agent, form])

  const triggerEnabled = form.watch('triggerEnabled')

  const handleSave = async () => {
    const values = form.getValues()
    await updateFilterConfig.mutateAsync({
      agentId: agent.id,
      data: values,
    })
  }

  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>Filtros de mensagens</Card.Title>
        <Card.Description>
          Restrinja quem pode falar com o agente e quando ele deve responder.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Stack gap={5}>
          <Controller
            control={form.control}
            name="allowedPhones"
            render={({ field }) => (
              <Field.Root>
                <Field.Label>Telefones permitidos</Field.Label>
                <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Adicione um número e pressione Enter (vazio = todos)"
                />
              </Field.Root>
            )}
          />

          <Controller
            control={form.control}
            name="allowedGroups"
            render={({ field }) => (
              <Field.Root>
                <Field.Label>Grupos permitidos</Field.Label>
                <TagsInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Adicione um chatId de grupo (vazio = todos)"
                />
              </Field.Root>
            )}
          />

          <Fieldset.Root>
            <Stack gap={4}>
              <Controller
                control={form.control}
                name="triggerEnabled"
                render={({ field }) => (
                  <SwitchField
                    label="Ativar por palavra-chave"
                    description="O agente só responde quando encontrar uma palavra-gatilho."
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              {triggerEnabled && (
                <Stack gap={4} pl={1}>
                  <Controller
                    control={form.control}
                    name="triggerWords"
                    render={({ field }) => (
                      <Field.Root>
                        <Field.Label>Palavras-gatilho</Field.Label>
                        <TagsInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Ex: atendente, pedido..."
                        />
                      </Field.Root>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="triggerCaseSensitive"
                    render={({ field }) => (
                      <SwitchField
                        label="Diferenciar maiúsculas/minúsculas"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="triggerRemoveFromText"
                    render={({ field }) => (
                      <SwitchField
                        label="Remover a palavra-gatilho do texto"
                        description="Remove a palavra do conteúdo antes de enviar ao agente."
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Stack>
              )}
            </Stack>
          </Fieldset.Root>
        </Stack>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Button
          size="sm"
          onClick={handleSave}
          loading={updateFilterConfig.isPending}
        >
          Salvar filtros
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}

const FiltersTab = memo(FiltersTabBase) as typeof FiltersTabBase

export { FiltersTab }
