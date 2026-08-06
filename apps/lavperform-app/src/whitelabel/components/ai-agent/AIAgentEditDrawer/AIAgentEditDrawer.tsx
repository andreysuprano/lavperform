import {
  Button,
  Card,
  createListCollection,
  Fieldset,
  HStack,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useController, useForm } from 'react-hook-form'
import { useHookFormMask } from 'use-mask-input'

import { CustomDrawer, LoadingState } from '@/components'
import { Input, Select, Textarea } from '@/components/forms'
import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useAIAgent,
  useUpdateAIAgent,
  useUpdateAIAgentMediaConfig,
  useUpdateAIAgentNotificationConfig,
  useUpdateAIAgentPersona,
} from '@/whitelabel/hooks'
import type { AIAgent, CommunicationStyleType, VoiceToneType } from '@/whitelabel/types'
import {
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
} from '@/whitelabel/constants/aiAgentPersonaDefaults'
import {
  formatTelefone,
  normalizeBrazilianWhatsAppPhone,
} from '@/utils/mask'
import type { Props } from './AIAgentEditDrawer.types'

// ─── Tom de voz e estilo ───────────────────────────────────────────────────────

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

// ─── Tipos de form ─────────────────────────────────────────────────────────────

interface BasicFormData {
  name: string
  description: string
}

interface PersonaFormData {
  personaName: string
  systemPrompt: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
  behaviorGuidelines: string
  guardrails: string
}

interface MediaFormData {
  audioEnabled: boolean
  audioDefaultMessage: string
  imageEnabled: boolean
  imageExtractionPrompt: string
  imageDefaultMessage: string
  videoEnabled: boolean
  videoExtractionPrompt: string
  videoDefaultMessage: string
}

interface NotificationFormData {
  helpNotificationEnabled: boolean
  helpNotificationPhone: string
}

function buildFormsFromAgent(a: AIAgent) {
  const mc = a.mediaConfig
  const nc = a.notificationConfig
  return {
    basic: {
      name: a.name,
      description: a.description ?? '',
    },
    persona: {
      personaName: a.persona?.personaName ?? '',
      systemPrompt: a.persona?.systemPrompt ?? '',
      voiceTone: a.persona?.voiceTone ?? 'FORMAL',
      communicationStyle: a.persona?.communicationStyle ?? 'BALANCED',
      behaviorGuidelines:
        a.persona?.behaviorGuidelines ?? DEFAULT_BEHAVIOR_GUIDELINES,
      guardrails: a.persona?.guardrails ?? DEFAULT_GUARDRAILS,
    },
    media: {
      audioEnabled: mc?.audioEnabled ?? false,
      audioDefaultMessage: mc?.audioDefaultMessage ?? '',
      imageEnabled: mc?.imageEnabled ?? false,
      imageExtractionPrompt: mc?.imageExtractionPrompt ?? '',
      imageDefaultMessage: mc?.imageDefaultMessage ?? '',
      videoEnabled: mc?.videoEnabled ?? false,
      videoExtractionPrompt: mc?.videoExtractionPrompt ?? '',
      videoDefaultMessage: mc?.videoDefaultMessage ?? '',
    },
    notification: {
      helpNotificationEnabled: nc?.helpNotificationEnabled ?? false,
      helpNotificationPhone: nc?.helpNotificationPhone
        ? formatTelefone(nc.helpNotificationPhone)
        : '',
    },
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

function AIAgentEditDrawerBase({ agent, isOpen, onClose }: Props) {
  const { selectedCompany } = useAuth()
  const {
    data: agentDetail,
    isLoading: isAgentDetailLoading,
    isError: isAgentDetailError,
  } = useAIAgent(selectedCompany?.id, isOpen ? agent.id : undefined)

  const updateAgent = useUpdateAIAgent()
  const updatePersona = useUpdateAIAgentPersona()
  const updateMediaConfig = useUpdateAIAgentMediaConfig()
  const updateNotificationConfig = useUpdateAIAgentNotificationConfig()

  const voiceToneCollection = useMemo(
    () => createListCollection({ items: voiceToneItems }),
    []
  )
  const communicationStyleCollection = useMemo(
    () => createListCollection({ items: communicationStyleItems }),
    []
  )

  // ─── Form: dados básicos ────────────────────────────────────────────────────
  const basicForm = useForm<BasicFormData>({
    defaultValues: {
      name: agent.name,
      description: agent.description || '',
    },
  })

  // ─── Form: persona ──────────────────────────────────────────────────────────
  const personaForm = useForm<PersonaFormData>({
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

  // ─── Form: mídia ────────────────────────────────────────────────────────────
  const mediaForm = useForm<MediaFormData>({
    defaultValues: {
      audioEnabled: agent.mediaConfig?.audioEnabled ?? false,
      audioDefaultMessage: agent.mediaConfig?.audioDefaultMessage || '',
      imageEnabled: agent.mediaConfig?.imageEnabled ?? false,
      imageExtractionPrompt: agent.mediaConfig?.imageExtractionPrompt || '',
      imageDefaultMessage: agent.mediaConfig?.imageDefaultMessage || '',
      videoEnabled: agent.mediaConfig?.videoEnabled ?? false,
      videoExtractionPrompt: agent.mediaConfig?.videoExtractionPrompt || '',
      videoDefaultMessage: agent.mediaConfig?.videoDefaultMessage || '',
    },
  })

  // ─── Form: notificação ──────────────────────────────────────────────────────
  const notificationForm = useForm<NotificationFormData>({
    defaultValues: {
      helpNotificationEnabled:
        agent.notificationConfig?.helpNotificationEnabled ?? false,
      helpNotificationPhone: agent.notificationConfig?.helpNotificationPhone
        ? formatTelefone(agent.notificationConfig.helpNotificationPhone)
        : '',
    },
  })
  const notificationRegister = notificationForm.register
  const maskedNotificationRegister = useHookFormMask(notificationRegister)

  const {
    field: { value: audioEnabled, onChange: setAudioEnabled },
  } = useController({ control: mediaForm.control, name: 'audioEnabled' })

  const {
    field: { value: imageEnabled, onChange: setImageEnabled },
  } = useController({ control: mediaForm.control, name: 'imageEnabled' })

  const {
    field: { value: videoEnabled, onChange: setVideoEnabled },
  } = useController({ control: mediaForm.control, name: 'videoEnabled' })

  const {
    field: {
      value: helpNotificationEnabled,
      onChange: setHelpNotificationEnabled,
    },
  } = useController({
    control: notificationForm.control,
    name: 'helpNotificationEnabled',
  })

  useEffect(() => {
    const src = agentDetail ?? agent
    const f = buildFormsFromAgent(src)
    basicForm.reset(f.basic)
    personaForm.reset(f.persona)
    mediaForm.reset(f.media)
    notificationForm.reset(f.notification)
  }, [agentDetail, agent, basicForm, personaForm, mediaForm, notificationForm])

  const showDetailLoading =
    isOpen &&
    isAgentDetailLoading &&
    agentDetail === undefined &&
    !isAgentDetailError

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveBasic = useCallback(async () => {
    const values = basicForm.getValues()
    await updateAgent.mutateAsync({
      agentId: agent.id,
      data: { name: values.name, description: values.description },
    })
  }, [basicForm, updateAgent, agent.id])

  const handleSavePersona = useCallback(async () => {
    const values = personaForm.getValues()
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
  }, [personaForm, updatePersona, agent.id])

  const handleSaveMedia = useCallback(async () => {
    const values = mediaForm.getValues()
    await updateMediaConfig.mutateAsync({
      agentId: agent.id,
      data: {
        audioEnabled: values.audioEnabled,
        audioDefaultMessage: values.audioDefaultMessage || undefined,
        imageEnabled: values.imageEnabled,
        imageExtractionPrompt: values.imageExtractionPrompt || undefined,
        imageDefaultMessage: values.imageDefaultMessage || undefined,
        videoEnabled: values.videoEnabled,
        videoExtractionPrompt: values.videoExtractionPrompt || undefined,
        videoDefaultMessage: values.videoDefaultMessage || undefined,
      },
    })
  }, [mediaForm, updateMediaConfig, agent.id])

  const handleSaveNotification = useCallback(async () => {
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
  }, [notificationForm, updateNotificationConfig, agent.id])

  return (
    <CustomDrawer
      isOpen={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      title={`Editar   ${agentDetail?.name ?? agent.name}`}
      size="xl"
    >
      {showDetailLoading ? (
        <LoadingState title="Carregando dados do agente..." />
      ) : (
      <Stack gap={6}>
        {/* ─── Dados básicos ─────────────────────────────────────────────────── */}
        <Card.Root variant="outline">
          <Card.Header>
            <Text fontWeight="semibold">Dados básicos</Text>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Input
                control={basicForm.control}
                name="name"
                label="Nome do agente"
              />
              <Textarea
                control={basicForm.control}
                name="description"
                label="Descrição"
                rows={3}
              />
            </Stack>
          </Card.Body>
          <Card.Footer justifyContent="flex-end">
            <Button
              size="sm"
              onClick={handleSaveBasic}
              loading={updateAgent.isPending}
            >
              Salvar dados básicos
            </Button>
          </Card.Footer>
        </Card.Root>

        {/* ─── Persona ───────────────────────────────────────────────────────── */}
        <Card.Root variant="outline">
          <Card.Header>
            <Text fontWeight="semibold">Persona e inteligência</Text>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Input
                control={personaForm.control}
                name="personaName"
                label="Nome da persona"
                placeholder="Ex: Sofia"
              />
              <Textarea
                control={personaForm.control}
                name="systemPrompt"
                label="Inteligência do agente (System Prompt)"
                placeholder="Cole aqui o prompt customizado..."
                rows={8}
              />
              <Select
                control={personaForm.control}
                name="voiceTone"
                label="Tom de voz"
                placeholder="Selecione o tom de voz"
                collection={voiceToneCollection}
              />
              <Select
                control={personaForm.control}
                name="communicationStyle"
                label="Estilo de comunicação"
                placeholder="Selecione o estilo"
                collection={communicationStyleCollection}
              />
              <Textarea
                control={personaForm.control}
                name="behaviorGuidelines"
                label="Regras de comportamento"
                rows={6}
              />
              <Textarea
                control={personaForm.control}
                name="guardrails"
                label="Guardrails"
                rows={6}
              />
            </Stack>
          </Card.Body>
          <Card.Footer justifyContent="flex-end">
            <Button
              size="sm"
              onClick={handleSavePersona}
              loading={updatePersona.isPending}
            >
              Salvar persona
            </Button>
          </Card.Footer>
        </Card.Root>

        {/* ─── Mídia ─────────────────────────────────────────────────────────── */}
        <Card.Root variant="outline">
          <Card.Header>
            <Text fontWeight="semibold">Configuração de mídia</Text>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              {/* Áudio */}
              <Fieldset.Root>
                <HStack justify="space-between" align="flex-start">
                  <Stack gap={0.5}>
                    <Fieldset.Legend fontSize="sm">Áudio</Fieldset.Legend>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente processe mensagens de áudio.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!audioEnabled}
                    onCheckedChange={(e) => setAudioEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
                <Fieldset.Content>
                  {!audioEnabled && (
                    <Textarea
                      control={mediaForm.control}
                      name="audioDefaultMessage"
                      label="Mensagem quando áudio está desabilitado"
                      placeholder="Ex: Desculpa, mas ainda não fui ensinado a ouvir áudios!"
                      rows={2}
                    />
                  )}
                </Fieldset.Content>
              </Fieldset.Root>

              {/* Imagem */}
              <Fieldset.Root>
                <HStack justify="space-between" align="flex-start">
                  <Stack gap={0.5}>
                    <Fieldset.Legend fontSize="sm">Imagem</Fieldset.Legend>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente analise imagens enviadas.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!imageEnabled}
                    onCheckedChange={(e) => setImageEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
                <Fieldset.Content>
                  {!imageEnabled && (
                    <Textarea
                      control={mediaForm.control}
                      name="imageDefaultMessage"
                      label="Mensagem quando imagem está desabilitada"
                      placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver imagens!"
                      rows={2}
                    />
                  )}
                  {imageEnabled && (
                    <Textarea
                      control={mediaForm.control}
                      name="imageExtractionPrompt"
                      label="Prompt de extração de imagem"
                      placeholder="Descreva como o agente deve analisar as imagens..."
                      rows={3}
                    />
                  )}
                </Fieldset.Content>
              </Fieldset.Root>

              {/* Vídeo */}
              <Fieldset.Root>
                <HStack justify="space-between" align="flex-start">
                  <Stack gap={0.5}>
                    <Fieldset.Legend fontSize="sm">Vídeo</Fieldset.Legend>
                    <Text fontSize="xs" color="fg.muted">
                      Permite que o agente analise vídeos enviados.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!videoEnabled}
                    onCheckedChange={(e) => setVideoEnabled(e.checked)}
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
                <Fieldset.Content>
                  {!videoEnabled && (
                    <Textarea
                      control={mediaForm.control}
                      name="videoDefaultMessage"
                      label="Mensagem quando vídeo está desabilitado"
                      placeholder="Ex: Desculpa, mas ainda não fui ensinado a ver vídeos!"
                      rows={2}
                    />
                  )}
                  {videoEnabled && (
                    <Textarea
                      control={mediaForm.control}
                      name="videoExtractionPrompt"
                      label="Prompt de extração de vídeo"
                      placeholder="Descreva como o agente deve analisar os vídeos..."
                      rows={3}
                    />
                  )}
                </Fieldset.Content>
              </Fieldset.Root>
            </Stack>
          </Card.Body>
          <Card.Footer justifyContent="flex-end">
            <Button
              size="sm"
              onClick={handleSaveMedia}
              loading={updateMediaConfig.isPending}
            >
              Salvar configuração de mídia
            </Button>
          </Card.Footer>
        </Card.Root>

        {/* ─── Notificações ──────────────────────────────────────────────────── */}
        <Card.Root variant="outline">
          <Card.Header>
            <Text fontWeight="semibold">Notificações</Text>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Fieldset.Root>
                <HStack justify="space-between" align="flex-start">
                  <Stack gap={0.5}>
                    <Fieldset.Legend fontSize="sm">
                      Notificar quando o cliente pedir ajuda
                    </Fieldset.Legend>
                    <Text fontSize="xs" color="fg.muted">
                      Envia um alerta para o telefone cadastrado quando o
                      cliente solicitar atendimento humano.
                    </Text>
                  </Stack>
                  <Switch.Root
                    checked={!!helpNotificationEnabled}
                    onCheckedChange={(e) =>
                      setHelpNotificationEnabled(e.checked)
                    }
                    size="md"
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>
                <Fieldset.Content>
                  {helpNotificationEnabled && (
                    <Stack gap={1}>
                      <Input
                        control={notificationForm.control}
                        label="Telefone para notificação"
                        placeholder="+55 (11) 99999-9999"
                        type="tel"
                        {...maskedNotificationRegister(
                          'helpNotificationPhone',
                          '+99 (99) 99999-9999'
                        )}
                      />
                      <Text fontSize="xs" color="fg.muted">
                        Com ou sem DDI. Se faltar o 55, adicionamos automaticamente.
                      </Text>
                    </Stack>
                  )}
                </Fieldset.Content>
              </Fieldset.Root>
            </Stack>
          </Card.Body>
          <Card.Footer justifyContent="flex-end">
            <Button
              size="sm"
              onClick={handleSaveNotification}
              loading={updateNotificationConfig.isPending}
            >
              Salvar notificações
            </Button>
          </Card.Footer>
        </Card.Root>
      </Stack>
      )}
    </CustomDrawer>
  )
}

const AIAgentEditDrawer = memo(
  AIAgentEditDrawerBase
) as typeof AIAgentEditDrawerBase

export { AIAgentEditDrawer, type Props as AIAgentEditDrawerProps }
