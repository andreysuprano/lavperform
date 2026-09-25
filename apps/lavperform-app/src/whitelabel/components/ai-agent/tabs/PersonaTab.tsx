import {
  Button,
  Card,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
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
import { useAuth } from '@/context/AuthContext'
import {
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
} from '@/whitelabel/constants/aiAgentPersonaDefaults'
import { useUpdateAIAgentPersona } from '@/whitelabel/hooks'
import { aiAgentService } from '@/whitelabel/services'
import type {
  AIAgent,
  CommunicationStyleType,
  PromptDocument,
  VoiceToneType,
} from '@/whitelabel/types'

import { PromptSheetChat } from '../PromptStudio/PromptSheetChat'
import { PromptTestPanel } from '../PromptStudio/PromptTestPanel'

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

const DOCUMENT_LABELS: Record<keyof PromptDocument, string> = {
  contextPrompt: 'Contexto do negócio',
  systemPrompt: 'Inteligência do agente (System Prompt)',
  behaviorGuidelines: 'Regras de comportamento',
  guardrails: 'Guardrails',
}

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

function ReadOnlyPromptDocument({ document }: { document: PromptDocument }) {
  return (
    <Stack gap={5}>
      {(Object.keys(DOCUMENT_LABELS) as Array<keyof PromptDocument>).map(
        (field) => (
          <Stack key={field} gap={1}>
            <Text fontWeight="semibold" fontSize="sm">
              {DOCUMENT_LABELS[field]}
            </Text>
            <Text
              fontSize="sm"
              whiteSpace="pre-wrap"
              borderWidth="1px"
              borderRadius="md"
              p={3}
              bg="bg.subtle"
            >
              {document[field] || '—'}
            </Text>
          </Stack>
        )
      )}
    </Stack>
  )
}

function PersonaTabBase({ agent }: PersonaTabProps) {
  const { selectedCompany } = useAuth()
  const updatePersona = useUpdateAIAgentPersona()

  const [pendingDocument, setPendingDocument] = useState<PromptDocument | null>(
    null
  )
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [isAcceptingPending, setIsAcceptingPending] = useState(false)
  const [studioError, setStudioError] = useState<string | null>(null)

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
  const companyId = selectedCompany?.id

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

  const handleDocument = useCallback((next: PromptDocument) => {
    setPendingDocument(next)
    setStudioError(null)
  }, [])

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
    setSuggestedQuestions([])
    setStudioError(null)
  }, [])

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
              <Text fontWeight="semibold" fontSize="sm">
                Ficha e prompt
              </Text>

              {companyId ? (
                <PromptSheetChat
                  companyId={companyId}
                  agentId={agent.id}
                  onDocument={handleDocument}
                  onSuggestedQuestions={setSuggestedQuestions}
                />
              ) : (
                <Text fontSize="sm" color="fg.error">
                  Selecione uma empresa para preencher a ficha.
                </Text>
              )}

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

              <ReadOnlyPromptDocument document={activeDocument} />
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
          <Card.Title>Testar prompt</Card.Title>
          <Card.Description>
            Teste o prompt pendente ou o salvo. Ajuste via ficha e gere de novo
            se precisar.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <PromptTestPanel
            document={activeDocument}
            suggestedQuestions={suggestedQuestions}
            proposal={null}
            onTest={handleTest}
            isTesting={isTesting}
          />
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}

const PersonaTab = memo(PersonaTabBase) as typeof PersonaTabBase

export { PersonaTab }
