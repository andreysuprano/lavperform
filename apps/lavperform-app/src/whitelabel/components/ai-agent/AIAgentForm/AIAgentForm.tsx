import {
  Button,
  Field,
  Fieldset,
  Input,
  Stack,
  Switch,
  Textarea,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'

import { CustomDrawer } from '@/components'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useCreateAIAgent,
  useUpdateAIAgent,
} from '@/whitelabel/hooks'

import type { Props } from './AIAgentForm.types'

function AIAgentFormBase({ mode, agentId, initialData, onClose }: Props) {
  const { selectedCompany } = useAuth()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = useCreateAIAgent()
  const updateMutation = useUpdateAIAgent()

  useEffect(() => {
    if (mode === 'edit') {
      const data = initialData
      if (data) {
        setName(data.name)
        setDescription(data.description || '')
        setActive(data.active)
      }
    } else if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description || '')
      setActive(initialData.active)
    }
  }, [initialData, mode])

  const handleSubmit = useCallback(async () => {
    if (!selectedCompany) return

    if (!name.trim()) {
      toaster.create({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para o agente de IA.',
        type: 'error',
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          modelConfig: {
            modelName: 'openai/gpt-5',
            temperature: 0.7,
            maxTokens: 8048,
          },
          memoryConfig: {
            memoryType: 'BUFFER',
            windowSize: 10,
          },
          persona: {
            language: 'PT_BR',
          },
        })
      } else if (mode === 'edit' && agentId) {
        await updateMutation.mutateAsync({
          agentId,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            active,
          },
        })
      }

      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedCompany,
    name,
    description,
    active,
    mode,
    agentId,
    createMutation,
    updateMutation,
    onClose,
  ])

  return (
    <CustomDrawer
      isOpen={true}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      title={mode === 'create' ? 'Criar Agente de IA' : 'Editar Agente de IA'}
      size="xl"
      footer={
        <Stack direction="row" gap={2} justify="flex-end" w="full">
          <Button variant="surface" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <RiSaveLine />
            Salvar
          </Button>
        </Stack>
      }
    >
      <Stack gap={6} as="form" onSubmit={(e) => e.preventDefault()}>
        <Fieldset.Root>
          <Fieldset.Legend>Informações Básicas</Fieldset.Legend>
          <Fieldset.Content>
            <Stack gap={4}>
              <Field.Root required>
                <Field.Label>
                  Nome do agente
                  <Field.RequiredIndicator />
                </Field.Label>
                <Input
                  placeholder="Ex: Assistente de vendas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Descrição</Field.Label>
                <Textarea
                  placeholder="Descreva o objetivo do agente..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </Field.Root>
              <Switch.Root
                checked={active}
                onCheckedChange={(e) => setActive(e.checked)}
              >
                <Switch.Label>Agente ativo</Switch.Label>
                <Switch.Control />
              </Switch.Root>
            </Stack>
          </Fieldset.Content>
        </Fieldset.Root>
      </Stack>
    </CustomDrawer>
  )
}

const AIAgentForm = memo(AIAgentFormBase) as typeof AIAgentFormBase

export { AIAgentForm, type Props as AIAgentFormProps }
