import {
  Badge,
  Box,
  Button,
  Card,
  Field,
  HStack,
  IconButton,
  Stack,
  Switch,
  Text,
  createListCollection,
} from '@chakra-ui/react'
import { memo, useEffect, useMemo } from 'react'
import { Controller, useController, useFieldArray, useForm } from 'react-hook-form'
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiDeleteBinLine } from 'react-icons/ri'

import { Input, Select, Textarea } from '@/components/forms'
import { toaster } from '@/components/ui/toaster'
import {
  useUpdateAIAgentJourneyConfig,
  useUpdateAIAgentNotificationConfig,
} from '@/whitelabel/hooks'
import type {
  AIAgent,
  FollowUpStep,
  JourneyTrigger,
} from '@/whitelabel/types'
import {
  formatTelefone,
  normalizeBrazilianWhatsAppPhone,
} from '@/utils/mask'

import { TagsInput } from './TagsInput'

const journeyTriggerItems = [
  { value: 'FIRST_MESSAGE', label: 'Primeira mensagem do cliente' },
  { value: 'MENU_LINK_SENT', label: 'Link do cardápio enviado' },
  { value: 'MANUAL', label: 'Manual (via API)' },
]

const delayFromItems = [
  { value: 'JOURNEY_START', label: 'Início da jornada' },
  { value: 'PREVIOUS_STEP', label: 'Step anterior' },
]

interface JourneyFormData {
  enabled: boolean
  journeyTrigger: JourneyTrigger
  followUpEnabled: boolean
  cancelOnReply: boolean
  followUpSteps: FollowUpStep[]
  helpKeywords: string[]
  helpAutoEscalate: boolean
  helpAckMessage: string
  purchaseWebhookEnabled: boolean
}

function defaultSteps(): FollowUpStep[] {
  return [
    {
      id: crypto.randomUUID(),
      delayMinutes: 15,
      delayFrom: 'JOURNEY_START',
      message: 'Oi {nome}! Conseguiu fazer seu pedido?',
      askForHelp: false,
      active: true,
    },
  ]
}

function buildJourneyForm(agent: AIAgent): JourneyFormData {
  const jc = agent.journeyConfig
  return {
    enabled: jc?.enabled ?? false,
    journeyTrigger: jc?.journeyTrigger ?? 'FIRST_MESSAGE',
    followUpEnabled: jc?.followUpEnabled ?? true,
    cancelOnReply: jc?.cancelOnReply ?? true,
    followUpSteps: jc?.followUpSteps?.length ? jc.followUpSteps : defaultSteps(),
    helpKeywords: jc?.helpKeywords ?? ['atendente', 'humano', 'ajuda'],
    helpAutoEscalate: jc?.helpAutoEscalate ?? true,
    helpAckMessage:
      jc?.helpAckMessage ?? 'Aguarde, vou chamar alguém para te ajudar!',
    purchaseWebhookEnabled: jc?.purchaseWebhookEnabled ?? true,
  }
}

interface NotificationFormData {
  helpNotificationEnabled: boolean
  helpNotificationPhone: string
}

function buildNotificationForm(agent: AIAgent): NotificationFormData {
  const nc = agent.notificationConfig
  return {
    helpNotificationEnabled: nc?.helpNotificationEnabled ?? false,
    helpNotificationPhone: nc?.helpNotificationPhone
      ? formatTelefone(nc.helpNotificationPhone)
      : '',
  }
}

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  return (
    <HStack
      justify="space-between"
      align="flex-start"
      borderWidth="1px"
      borderRadius="md"
      p={3}
    >
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

interface JourneyTabProps {
  agent: AIAgent
}

function JourneyTabBase({ agent }: JourneyTabProps) {
  const updateJourneyConfig = useUpdateAIAgentJourneyConfig()
  const updateNotificationConfig = useUpdateAIAgentNotificationConfig()

  const journeyTriggerCollection = useMemo(
    () => createListCollection({ items: journeyTriggerItems }),
    []
  )
  const delayFromCollection = useMemo(
    () => createListCollection({ items: delayFromItems }),
    []
  )

  const form = useForm<JourneyFormData>({
    defaultValues: buildJourneyForm(agent),
  })
  const notificationForm = useForm<NotificationFormData>({
    defaultValues: buildNotificationForm(agent),
  })

  useEffect(() => {
    form.reset(buildJourneyForm(agent))
    notificationForm.reset(buildNotificationForm(agent))
  }, [agent, form, notificationForm])

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'followUpSteps',
  })

  const {
    field: { value: enabled, onChange: setEnabled },
  } = useController({ control: form.control, name: 'enabled' })
  const {
    field: { value: followUpEnabled, onChange: setFollowUpEnabled },
  } = useController({ control: form.control, name: 'followUpEnabled' })
  const {
    field: { value: cancelOnReply, onChange: setCancelOnReply },
  } = useController({ control: form.control, name: 'cancelOnReply' })
  const {
    field: { value: helpAutoEscalate, onChange: setHelpAutoEscalate },
  } = useController({ control: form.control, name: 'helpAutoEscalate' })
  const {
    field: { value: purchaseWebhookEnabled, onChange: setPurchaseWebhookEnabled },
  } = useController({ control: form.control, name: 'purchaseWebhookEnabled' })
  const {
    field: { value: helpNotificationEnabled, onChange: setHelpNotificationEnabled },
  } = useController({
    control: notificationForm.control,
    name: 'helpNotificationEnabled',
  })

  const handleSaveJourney = async () => {
    const values = form.getValues()
    await updateJourneyConfig.mutateAsync({
      agentId: agent.id,
      data: {
        enabled: values.enabled,
        journeyTrigger: values.journeyTrigger,
        followUpEnabled: values.followUpEnabled,
        cancelOnReply: values.cancelOnReply,
        followUpSteps: values.followUpSteps.map((step) => ({
          ...step,
          delayMinutes: Number(step.delayMinutes) || 1,
        })),
        helpKeywords: values.helpKeywords,
        helpAutoEscalate: values.helpAutoEscalate,
        helpAckMessage: values.helpAckMessage || null,
        purchaseWebhookEnabled: values.purchaseWebhookEnabled,
      },
    })
  }

  const handleSaveNotification = async () => {
    const values = notificationForm.getValues()
    const rawPhone = values.helpNotificationPhone?.trim() || ''

    if (!rawPhone) {
      await updateNotificationConfig.mutateAsync({
        agentId: agent.id,
        data: {
          helpNotificationEnabled: false,
          helpNotificationPhone: undefined,
        },
      })
      return
    }

    const normalizedPhone = normalizeBrazilianWhatsAppPhone(rawPhone)
    if (!normalizedPhone) {
      toaster.create({
        title: 'Telefone inválido',
        description:
          'Informe um número válido com DDD. Ex: +55 (11) 99999-9999 ou 11999999999.',
        type: 'error',
      })
      return
    }

    await updateNotificationConfig.mutateAsync({
      agentId: agent.id,
      data: {
        helpNotificationEnabled: values.helpNotificationEnabled,
        helpNotificationPhone: normalizedPhone,
      },
    })
  }

  return (
    <Stack gap={6}>
      <Card.Root variant="outline">
        <Card.Header>
          <Card.Title>Jornada do cliente</Card.Title>
          <Card.Description>
            Configure follow-ups automáticos e a escalação para atendimento
            humano.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Stack gap={5}>
            <SwitchRow
              label="Habilitar jornada"
              description="Ativa follow-ups e escalação humana para este agente."
              checked={!!enabled}
              onChange={setEnabled}
            />

            <Select
              control={form.control}
              name="journeyTrigger"
              label="Gatilho da jornada"
              placeholder="Selecione o gatilho"
              collection={journeyTriggerCollection}
            />

            <HStack gap={4} align="stretch">
              <Box flex={1}>
                <SwitchRow
                  label="Follow-ups"
                  checked={!!followUpEnabled}
                  onChange={setFollowUpEnabled}
                />
              </Box>
              <Box flex={1}>
                <SwitchRow
                  label="Cancelar ao responder"
                  checked={!!cancelOnReply}
                  onChange={setCancelOnReply}
                />
              </Box>
            </HStack>

            <Stack gap={3}>
              <Text fontSize="sm" fontWeight="medium">
                Cadência de follow-ups
              </Text>
              {fields.map((field, index) => (
                <Box key={field.id} borderWidth="1px" borderRadius="md" p={4}>
                  <Stack gap={3}>
                    <HStack justify="space-between">
                      <Badge variant="subtle">Step {index + 1}</Badge>
                      <HStack gap={1}>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label="Mover para cima"
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                        >
                          <RiArrowUpLine />
                        </IconButton>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          aria-label="Mover para baixo"
                          disabled={index === fields.length - 1}
                          onClick={() => move(index, index + 1)}
                        >
                          <RiArrowDownLine />
                        </IconButton>
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          aria-label="Remover step"
                          onClick={() => remove(index)}
                        >
                          <RiDeleteBinLine />
                        </IconButton>
                      </HStack>
                    </HStack>

                    <HStack gap={3} align="flex-start">
                      <Box flex={1}>
                        <Input
                          control={form.control}
                          name={`followUpSteps.${index}.delayMinutes`}
                          label="Delay (min)"
                          type="number"
                        />
                      </Box>
                      <Box flex={1}>
                        <Select
                          control={form.control}
                          name={`followUpSteps.${index}.delayFrom`}
                          label="Referência"
                          placeholder="Selecione"
                          collection={delayFromCollection}
                        />
                      </Box>
                    </HStack>

                    <Textarea
                      control={form.control}
                      name={`followUpSteps.${index}.message`}
                      label="Mensagem"
                      rows={2}
                    />
                    <Text fontSize="xs" color="fg.muted">
                      Variáveis: {'{nome}'}, {'{telefone}'}
                    </Text>

                    <Controller
                      control={form.control}
                      name={`followUpSteps.${index}.active`}
                      render={({ field: activeField }) => (
                        <HStack gap={2}>
                          <Switch.Root
                            checked={!!activeField.value}
                            onCheckedChange={(e) => activeField.onChange(e.checked)}
                            size="sm"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                          </Switch.Root>
                          <Text fontSize="sm">Ativo</Text>
                        </HStack>
                      )}
                    />
                  </Stack>
                </Box>
              ))}
              <Button
                size="sm"
                variant="outline"
                alignSelf="flex-start"
                disabled={fields.length >= 10}
                onClick={() =>
                  append({
                    id: crypto.randomUUID(),
                    delayMinutes: 30,
                    delayFrom: 'PREVIOUS_STEP',
                    message: '',
                    askForHelp: false,
                    active: true,
                  })
                }
              >
                <RiAddLine />
                Adicionar step
              </Button>
            </Stack>

            <Controller
              control={form.control}
              name="helpKeywords"
              render={({ field }) => (
                <Field.Root>
                  <Field.Label>Palavras de escalação</Field.Label>
                  <TagsInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Ex: atendente, humano..."
                  />
                </Field.Root>
              )}
            />

            <Textarea
              control={form.control}
              name="helpAckMessage"
              label="Mensagem ao solicitar ajuda"
              rows={2}
            />

            <SwitchRow
              label="Escalação automática por palavra-chave"
              checked={!!helpAutoEscalate}
              onChange={setHelpAutoEscalate}
            />

            <SwitchRow
              label="Webhook de compra habilitado"
              description="Permite marcar a jornada como concluída quando uma compra é registrada."
              checked={!!purchaseWebhookEnabled}
              onChange={setPurchaseWebhookEnabled}
            />
          </Stack>
        </Card.Body>
        <Card.Footer justifyContent="flex-end">
          <Button
            size="sm"
            onClick={handleSaveJourney}
            loading={updateJourneyConfig.isPending}
          >
            Salvar jornada
          </Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root variant="outline">
        <Card.Header>
          <Card.Title>Notificação de ajuda</Card.Title>
          <Card.Description>
            Envia um alerta para o telefone cadastrado quando o cliente solicitar
            atendimento humano.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Stack gap={4}>
            <SwitchRow
              label="Notificar quando o cliente pedir ajuda"
              checked={!!helpNotificationEnabled}
              onChange={setHelpNotificationEnabled}
            />
            {helpNotificationEnabled && (
              <Input
                control={notificationForm.control}
                name="helpNotificationPhone"
                label="Telefone para notificação"
                placeholder="+55 (11) 99999-9999"
                type="tel"
              />
            )}
          </Stack>
        </Card.Body>
        <Card.Footer justifyContent="flex-end">
          <Button
            size="sm"
            onClick={handleSaveNotification}
            loading={updateNotificationConfig.isPending}
          >
            Salvar notificação
          </Button>
        </Card.Footer>
      </Card.Root>
    </Stack>
  )
}

const JourneyTab = memo(JourneyTabBase) as typeof JourneyTabBase

export { JourneyTab }
