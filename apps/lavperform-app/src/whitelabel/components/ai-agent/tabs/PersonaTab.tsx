import {
  Button,
  Card,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { AxiosError } from 'axios'
import type { ComponentType } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  useDiscardPromptStudioProposal,
  useUpdateAIAgentPersona,
} from '@/whitelabel/hooks'
import { aiAgentService } from '@/whitelabel/services'
import type {
  AIAgent,
  CommunicationStyleType,
  PromptDocument,
  PromptProposal,
  QuestionnaireAnswers,
  VoiceToneType,
} from '@/whitelabel/types'

import { PromptDocumentEditor } from '../PromptStudio/PromptDocumentEditor'
import { PromptStudioChat } from '../PromptStudio/PromptStudioChat'
import { PromptTestPanel } from '../PromptStudio/PromptTestPanel'
import { QuestionnaireForm } from '../PromptStudio/QuestionnaireForm'

import { SelectableIconCard } from './SelectableIconCard'

const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.'

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
  contextPrompt: string
  systemPrompt: string
  voiceTone: VoiceToneType
  communicationStyle: CommunicationStyleType
  behaviorGuidelines: string
  guardrails: string
}

interface PersonaTabProps {
  agent: AIAgent
}

function personaToFormValues(agent: AIAgent): PersonaFormData {
  return {
    personaName: agent.persona?.personaName || '',
    contextPrompt: agent.persona?.contextPrompt || '',
    systemPrompt: agent.persona?.systemPrompt || '',
    voiceTone: agent.persona?.voiceTone || 'FORMAL',
    communicationStyle: agent.persona?.communicationStyle || 'BALANCED',
    behaviorGuidelines:
      agent.persona?.behaviorGuidelines || DEFAULT_BEHAVIOR_GUIDELINES,
    guardrails: agent.persona?.guardrails || DEFAULT_GUARDRAILS,
  }
}

function formToDocument(values: PersonaFormData): PromptDocument {
  return {
    contextPrompt: values.contextPrompt,
    systemPrompt: values.systemPrompt,
    behaviorGuidelines: values.behaviorGuidelines,
    guardrails: values.guardrails,
  }
}

function PersonaTabBase({ agent }: PersonaTabProps) {
  const updatePersona = useUpdateAIAgentPersona()
  const discardProposal = useDiscardPromptStudioProposal()

  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [pendingDocument, setPendingDocument] = useState<PromptDocument | null>(
    null
  )
  /** Bumps when questionnaire replaces the pending draft; used to invalidate proposals. */
  const [pendingGenerationId, setPendingGenerationId] = useState(0)
  /** Generation id of pendingDocument when the current proposal was created; null if not against pending. */
  const [proposalPendingGenerationId, setProposalPendingGenerationId] =
    useState<number | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isAcceptingPending, setIsAcceptingPending] = useState(false)
  const [studioError, setStudioError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatSeed, setChatSeed] = useState<{
    question: string
    answer: string
    whatWasWrong: string
  } | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const form = useForm<PersonaFormData>({
    defaultValues: personaToFormValues(agent),
  })

  useEffect(() => {
    form.reset(personaToFormValues(agent))
  }, [agent, form])

  const watched = form.watch()

  const savedDocument = useMemo(
    () => formToDocument(watched),
    [
      watched.contextPrompt,
      watched.systemPrompt,
      watched.behaviorGuidelines,
      watched.guardrails,
    ]
  )

  const activeDocument = pendingDocument ?? savedDocument

  const handleSave = form.handleSubmit(async (values) => {
    setStudioError(null)
    await updatePersona.mutateAsync({
      agentId: agent.id,
      data: {
        personaName: values.personaName || undefined,
        contextPrompt: values.contextPrompt || undefined,
        systemPrompt: values.systemPrompt || undefined,
        voiceTone: values.voiceTone,
        communicationStyle: values.communicationStyle,
        behaviorGuidelines: values.behaviorGuidelines || undefined,
        guardrails: values.guardrails || undefined,
        language: 'PT_BR',
      },
    })
  })

  const handleGenerate = useCallback(
    async (answers: QuestionnaireAnswers) => {
      setIsGenerating(true)
      setStudioError(null)
      try {
        const response = await aiAgentService.generatePromptStudio(
          answers,
          agent.id
        )
        setPendingDocument(response.data.document)
        setPendingGenerationId((id) => id + 1)
        setProposalPendingGenerationId(null)
        setChatError(null)
        setSuggestedQuestions(response.data.suggestedQuestions)
        setShowQuestionnaire(false)
        void discardProposal.mutateAsync({ agentId: agent.id }).catch(() => {
          // Ignora falha ao limpar proposta antiga do fio
        })
      } catch {
        setStudioError('Não foi possível gerar o prompt. Tente de novo.')
      } finally {
        setIsGenerating(false)
      }
    },
    [agent.id, discardProposal]
  )

  const handleDocumentChange = useCallback(
    (next: PromptDocument) => {
      if (pendingDocument) {
        setPendingDocument(next)
        return
      }
      form.setValue('contextPrompt', next.contextPrompt, { shouldDirty: true })
      form.setValue('systemPrompt', next.systemPrompt, { shouldDirty: true })
      form.setValue('behaviorGuidelines', next.behaviorGuidelines, {
        shouldDirty: true,
      })
      form.setValue('guardrails', next.guardrails, { shouldDirty: true })
    },
    [form, pendingDocument]
  )

  const handleAcceptPending = useCallback(async () => {
    if (!pendingDocument) return
    setIsAcceptingPending(true)
    setStudioError(null)
    try {
      await updatePersona.mutateAsync({
        agentId: agent.id,
        data: {
          contextPrompt: pendingDocument.contextPrompt || undefined,
          systemPrompt: pendingDocument.systemPrompt || undefined,
          behaviorGuidelines: pendingDocument.behaviorGuidelines || undefined,
          guardrails: pendingDocument.guardrails || undefined,
        },
      })
      form.setValue('contextPrompt', pendingDocument.contextPrompt)
      form.setValue('systemPrompt', pendingDocument.systemPrompt)
      form.setValue('behaviorGuidelines', pendingDocument.behaviorGuidelines)
      form.setValue('guardrails', pendingDocument.guardrails)
      setPendingDocument(null)
    } catch {
      form.reset(personaToFormValues(agent))
    } finally {
      setIsAcceptingPending(false)
    }
  }, [agent, form, pendingDocument, updatePersona])

  const handleDiscardPending = useCallback(() => {
    setPendingDocument(null)
    setPendingGenerationId((id) => id + 1)
    setSuggestedQuestions([])
    setStudioError(null)
    void discardProposal
      .mutateAsync({ agentId: agent.id, silent: true })
      .catch(() => {
        // Limpa proposta local via proposalEpoch mesmo se o discard falhar
      })
  }, [agent.id, discardProposal])

  const handleTest = useCallback(
    async (question: string) => {
      setIsTesting(true)
      try {
        const response = await aiAgentService.testPromptStudio(
          { document: activeDocument, question },
          agent.id
        )
        return response.data.answer
      } finally {
        setIsTesting(false)
      }
    },
    [activeDocument, agent.id]
  )

  const handlePropose = useCallback(
    async (payload: {
      question: string
      answer: string
      whatWasWrong: string
    }) => {
      setChatError(null)
      setShowChat(true)
      setChatSeed(payload)
    },
    []
  )

  const handleProposalReceived = useCallback(() => {
    if (pendingDocument) {
      setProposalPendingGenerationId(pendingGenerationId)
    } else {
      setProposalPendingGenerationId(null)
    }
  }, [pendingDocument, pendingGenerationId])

  const handleAcceptChatProposal = useCallback(
    async (proposal: PromptProposal) => {
      const currentUpdatedAt = agent.persona?.updatedAt ?? null
      // Match isProposalStale: missing updatedAt counts as not equal when baseUpdatedAt is set
      if (
        proposal.baseUpdatedAt &&
        proposal.baseUpdatedAt !== currentUpdatedAt
      ) {
        setChatError(STALE_MESSAGE)
        throw new Error(STALE_MESSAGE)
      }

      if (
        proposalPendingGenerationId !== null &&
        proposalPendingGenerationId !== pendingGenerationId
      ) {
        setChatError(STALE_MESSAGE)
        throw new Error(STALE_MESSAGE)
      }

      if (pendingDocument) {
        setChatError(null)
        setPendingDocument({
          ...pendingDocument,
          ...proposal.changes,
        })
        await discardProposal.mutateAsync({ agentId: agent.id })
        return
      }

      setChatError(null)
      try {
        await updatePersona.mutateAsync({
          agentId: agent.id,
          data: { ...proposal.changes },
        })
        await discardProposal.mutateAsync({ agentId: agent.id })
        if (proposal.changes.contextPrompt !== undefined) {
          form.setValue('contextPrompt', proposal.changes.contextPrompt)
        }
        if (proposal.changes.systemPrompt !== undefined) {
          form.setValue('systemPrompt', proposal.changes.systemPrompt)
        }
        if (proposal.changes.behaviorGuidelines !== undefined) {
          form.setValue(
            'behaviorGuidelines',
            proposal.changes.behaviorGuidelines
          )
        }
        if (proposal.changes.guardrails !== undefined) {
          form.setValue('guardrails', proposal.changes.guardrails)
        }
      } catch (error) {
        form.reset(personaToFormValues(agent))
        const status =
          error instanceof AxiosError ? error.response?.status : undefined
        const message =
          error instanceof AxiosError
            ? (error.response?.data as { message?: string })?.message
            : undefined
        if (status === 409 || message === STALE_MESSAGE) {
          setChatError(STALE_MESSAGE)
        }
        throw error
      }
    },
    [
      agent,
      discardProposal,
      form,
      pendingDocument,
      pendingGenerationId,
      proposalPendingGenerationId,
      updatePersona,
    ]
  )

  return (
    <Stack gap={6}>
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

            <Stack gap={3}>
              <HStack justify="space-between" align="center">
                <Text fontWeight="semibold" fontSize="sm">
                  Prompt do agente
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQuestionnaire((prev) => !prev)}
                >
                  {showQuestionnaire
                    ? 'Fechar questionário'
                    : 'Refazer questionário'}
                </Button>
              </HStack>

              {showQuestionnaire ? (
                <QuestionnaireForm
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              ) : null}

              {studioError ? (
                <Text fontSize="sm" color="fg.error">
                  {studioError}
                </Text>
              ) : null}

              {pendingDocument ? (
                <Stack
                  gap={2}
                  borderWidth="1px"
                  borderRadius="md"
                  p={3}
                  bg="bg.subtle"
                >
                  <Text fontSize="sm" fontWeight="medium">
                    Documento novo (ainda não salvo)
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    Aceite para gravar os quatro textos na persona. Até lá o
                    prompt salvo permanece igual.
                  </Text>
                  <HStack>
                    <Button
                      size="sm"
                      loading={isAcceptingPending}
                      onClick={() => void handleAcceptPending()}
                    >
                      Aceitar documento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDiscardPending}
                    >
                      Descartar rascunho
                    </Button>
                  </HStack>
                </Stack>
              ) : null}

              <PromptDocumentEditor
                document={activeDocument}
                onChange={handleDocumentChange}
              />
            </Stack>
          </Stack>
        </Card.Body>
        <Card.Footer justifyContent="flex-end">
          <Button
            size="sm"
            onClick={handleSave}
            loading={updatePersona.isPending}
            disabled={Boolean(pendingDocument)}
          >
            Salvar persona
          </Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root variant="outline">
        <Card.Header>
          <Card.Title>Testar e ajustar</Card.Title>
          <Card.Description>
            Teste o prompt pendente ou o salvo. Se a resposta não ficar boa,
            abra o chat especialista.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Stack gap={8}>
            <PromptTestPanel
              document={activeDocument}
              suggestedQuestions={suggestedQuestions}
              proposal={null}
              onTest={handleTest}
              onPropose={handlePropose}
              onAcceptProposal={() => undefined}
              onDiscardProposal={() => undefined}
              isTesting={isTesting}
            />

            {showChat ? (
              <PromptStudioChat
                agentId={agent.id}
                document={activeDocument}
                seed={chatSeed}
                onSeedConsumed={() => setChatSeed(null)}
                onProposalReceived={handleProposalReceived}
                proposalEpoch={pendingGenerationId}
                onAcceptProposal={handleAcceptChatProposal}
                errorMessage={chatError}
              />
            ) : null}
          </Stack>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}

const PersonaTab = memo(PersonaTabBase) as typeof PersonaTabBase

export { PersonaTab }
