import {
  Button,
  createListCollection,
  Fieldset,
  Stack,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import { Select, Textarea } from '@/components/forms'
import type {
  CommunicationStyleType,
  QuestionnaireAnswers,
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

const schema = yup.object({
  services: yup.string().trim().required('Serviços são obrigatórios'),
  focus: yup.string().trim().required('Foco é obrigatório'),
  mustNotPromise: yup
    .string()
    .trim()
    .required('O que não pode prometer é obrigatório'),
  hoursAndDeadline: yup.string().optional(),
  pricing: yup.string().optional(),
  handoff: yup.string().optional(),
  voiceTone: yup.string().required('Tom de voz é obrigatório'),
  communicationStyle: yup
    .string()
    .required('Estilo de comunicação é obrigatório'),
})

export type QuestionnaireFormValues = {
  services: string
  focus: string
  mustNotPromise: string
  hoursAndDeadline?: string
  pricing?: string
  handoff?: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
}

interface QuestionnaireFormProps {
  onGenerate: (answers: QuestionnaireAnswers) => void | Promise<void>
  isGenerating?: boolean
  defaultValues?: Partial<QuestionnaireFormValues>
}

function QuestionnaireFormBase({
  onGenerate,
  isGenerating = false,
  defaultValues,
}: QuestionnaireFormProps) {
  const form = useForm<QuestionnaireFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(schema) as any,
    defaultValues: {
      services: '',
      focus: '',
      mustNotPromise: '',
      hoursAndDeadline: '',
      pricing: '',
      handoff: '',
      voiceTone: 'FORMAL',
      communicationStyle: 'BALANCED',
      ...defaultValues,
    },
  })

  const voiceToneCollection = useMemo(
    () => createListCollection({ items: voiceToneItems }),
    []
  )

  const communicationStyleCollection = useMemo(
    () => createListCollection({ items: communicationStyleItems }),
    []
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await onGenerate({
      services: values.services.trim(),
      focus: values.focus.trim(),
      mustNotPromise: values.mustNotPromise.trim(),
      hoursAndDeadline: values.hoursAndDeadline?.trim() || undefined,
      pricing: values.pricing?.trim() || undefined,
      handoff: values.handoff?.trim() || undefined,
      voiceTone: values.voiceTone,
      communicationStyle: values.communicationStyle,
    })
  })

  return (
    <Stack gap={6} as="form" onSubmit={handleSubmit}>
      <Fieldset.Root>
        <Fieldset.Legend>Questionário do negócio</Fieldset.Legend>
        <Fieldset.HelperText>
          Preencha os campos obrigatórios para gerar o prompt do agente. Sem
          serviços, foco e o que não pode prometer, a geração não é chamada.
        </Fieldset.HelperText>
        <Fieldset.Content>
          <Stack gap={4}>
            <Textarea
              control={form.control}
              name="services"
              label="Serviços"
              placeholder="Ex: Lavagem, passagem e retirada"
              rows={3}
              required
            />
            <Textarea
              control={form.control}
              name="focus"
              label="Foco do atendimento"
              placeholder="Ex: Responder clientes no WhatsApp"
              rows={2}
              required
            />
            <Textarea
              control={form.control}
              name="mustNotPromise"
              label="O que não pode prometer"
              placeholder="Ex: Não prometer prazo sem confirmar"
              rows={2}
              required
            />
            <Textarea
              control={form.control}
              name="hoursAndDeadline"
              label="Horário e prazo"
              placeholder="Opcional"
              rows={2}
            />
            <Textarea
              control={form.control}
              name="pricing"
              label="Preços"
              placeholder="Opcional"
              rows={2}
            />
            <Textarea
              control={form.control}
              name="handoff"
              label="Passagem para atendente"
              placeholder="Opcional"
              rows={2}
            />
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <Fieldset.Root>
        <Fieldset.Legend>Tom e estilo</Fieldset.Legend>
        <Fieldset.Content>
          <Stack gap={4}>
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
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <Stack gap={2}>
        {form.formState.errors.services ||
        form.formState.errors.focus ||
        form.formState.errors.mustNotPromise ? (
          <Text fontSize="sm" color="fg.error">
            Preencha serviços, foco e o que não pode prometer antes de gerar.
          </Text>
        ) : null}
        <Button type="submit" loading={isGenerating} alignSelf="flex-start">
          Gerar prompt
        </Button>
      </Stack>
    </Stack>
  )
}

const QuestionnaireForm = memo(
  QuestionnaireFormBase
) as typeof QuestionnaireFormBase

export { QuestionnaireForm, type QuestionnaireFormProps }
