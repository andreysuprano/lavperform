import { Button, HStack, Input, Stack, Steps, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'
import * as yup from 'yup'

import { CustomDrawer } from '@/components'
import { toaster } from '@/components/ui/toaster'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { invalidateQueries } from '@/lib/react-query'
import {
  useUpdateAIAgentMediaConfig,
  useUpdateAIAgentPersona,
} from '@/whitelabel/hooks'
import { aiAgentService } from '@/whitelabel/services'
import type {
  CommunicationStyleType,
  PromptDocument,
  VoiceToneType,
} from '@/whitelabel/types'

import { AIAgentWizardStep1 } from '../AIAgentWizardStep1'
import type { Step1FormData } from '../AIAgentWizardStep1'
import { AIAgentWizardStep3 } from '../AIAgentWizardStep3'
import type { Step3FormData } from '../AIAgentWizardStep3'
import { PromptSheetChat } from '../PromptStudio/PromptSheetChat'
import { PromptTestPanel } from '../PromptStudio/PromptTestPanel'

import type { Props } from './AIAgentWizard.types'

const STEPS = [
  { label: 'Dados básicos', description: 'Nome e descrição' },
  { label: 'Prompt', description: 'Ficha e teste' },
  { label: 'Mídia', description: 'Áudio, imagem e vídeo' },
]

const step1Schema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
})

const DOCUMENT_LABELS: Record<keyof PromptDocument, string> = {
  contextPrompt: 'Contexto do negócio',
  systemPrompt: 'Inteligência do agente (System Prompt)',
  behaviorGuidelines: 'Regras de comportamento',
  guardrails: 'Guardrails',
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

function AIAgentWizardBase({ onClose }: Props) {
  const { colorPalette } = useWhiteLabel()
  const { selectedCompany } = useAuth()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [personaName, setPersonaName] = useState('')
  const [voiceTone, setVoiceTone] = useState<VoiceToneType>('FORMAL')
  const [communicationStyle, setCommunicationStyle] =
    useState<CommunicationStyleType>('BALANCED')
  const [document, setDocument] = useState<PromptDocument | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [promptStepError, setPromptStepError] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)

  const updatePersona = useUpdateAIAgentPersona()
  const updateMediaConfig = useUpdateAIAgentMediaConfig()

  const step1Form = useForm<Step1FormData>({
    resolver: yupResolver(step1Schema),
    defaultValues: { name: '', description: '' },
  })

  const step3Form = useForm<Step3FormData>({
    defaultValues: {
      audioEnabled: false,
      audioDefaultMessage: '',
      imageEnabled: false,
      imageExtractionPrompt: '',
      imageDefaultMessage: '',
      videoEnabled: false,
      videoExtractionPrompt: '',
      videoDefaultMessage: '',
    },
  })

  const agentName = step1Form.watch('name')
  const companyId = selectedCompany?.id

  const handleDocument = useCallback((next: PromptDocument) => {
    setDocument(next)
    setPromptStepError(null)
  }, [])

  const handleTest = useCallback(
    async (question: string) => {
      if (!document) {
        throw new Error('Documento ausente')
      }
      setIsTesting(true)
      try {
        const response = await aiAgentService.testPromptStudio({
          document,
          question,
        })
        return response.data.answer
      } finally {
        setIsTesting(false)
      }
    },
    [document]
  )

  const handleNext = useCallback(async () => {
    if (currentStep === 0) {
      const valid = await step1Form.trigger()
      if (valid) setCurrentStep(1)
      return
    }
    if (currentStep === 1) {
      if (!document) {
        setPromptStepError('Gere o prompt pela ficha antes de continuar.')
        return
      }
      setPromptStepError(null)
      setCurrentStep(2)
    }
  }, [currentStep, step1Form, document])

  const handleFinish = useCallback(async () => {
    if (isSubmitting || !document || !companyId) return

    setIsSubmitting(true)
    setFinishError(null)
    try {
      const s1 = step1Form.getValues()
      const s3 = step3Form.getValues()
      const name = personaName.trim() || agentName || undefined

      const created = await aiAgentService.createAgent(companyId, {
        name: s1.name,
        description: s1.description,
        persona: {
          personaName: name,
          contextPrompt: document.contextPrompt || undefined,
          systemPrompt: document.systemPrompt || undefined,
          voiceTone,
          communicationStyle,
          language: 'PT_BR',
        },
        modelConfig: {
          modelName: 'openai/gpt-5',
          temperature: 0.7,
          maxTokens: 8048,
        },
        memoryConfig: {
          memoryType: 'BUFFER',
          windowSize: 10,
        },
      })
      const agent = created.data
      invalidateQueries.aiAgentsList(companyId)

      try {
        await aiAgentService.adoptPromptSheet(companyId, agent.id)
      } catch {
        const message =
          'Agente criado, mas não foi possível copiar a ficha para ele. Suas respostas continuam salvas — tente Finalizar de novo ou abra o agente e complete a ficha.'
        setFinishError(message)
        toaster.create({
          title: 'Erro ao copiar a ficha',
          description: message,
          type: 'error',
        })
        return
      }

      await updatePersona.mutateAsync({
        agentId: agent.id,
        data: {
          personaName: name,
          contextPrompt: document.contextPrompt || undefined,
          systemPrompt: document.systemPrompt || undefined,
          voiceTone,
          communicationStyle,
          language: 'PT_BR',
          behaviorGuidelines: document.behaviorGuidelines,
          guardrails: document.guardrails,
        },
      })

      await updateMediaConfig.mutateAsync({
        agentId: agent.id,
        data: {
          audioEnabled: s3.audioEnabled,
          audioDefaultMessage: s3.audioDefaultMessage || undefined,
          imageEnabled: s3.imageEnabled,
          imageExtractionPrompt: s3.imageExtractionPrompt || undefined,
          imageDefaultMessage: s3.imageDefaultMessage || undefined,
          videoEnabled: s3.videoEnabled,
          videoExtractionPrompt: s3.videoExtractionPrompt || undefined,
          videoDefaultMessage: s3.videoDefaultMessage || undefined,
        },
      })

      toaster.create({
        title: 'Sucesso',
        description: 'Agente de IA criado com sucesso!',
        type: 'success',
      })
      onClose()
      navigate(`/whitelabel/ai-agent/${agent.id}`)
    } catch {
      const message =
        'Não foi possível finalizar a criação do agente. Suas respostas da ficha foram mantidas — tente de novo.'
      setFinishError(message)
      toaster.create({
        title: 'Erro ao finalizar',
        description: message,
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    document,
    companyId,
    step1Form,
    step3Form,
    personaName,
    agentName,
    voiceTone,
    communicationStyle,
    updatePersona,
    updateMediaConfig,
    onClose,
    navigate,
  ])

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }, [currentStep])

  const isLastStep = currentStep === STEPS.length - 1

  const footer = (
    <HStack w="full" justify="space-between">
      <Button
        variant="ghost"
        onClick={handleBack}
        disabled={currentStep === 0 || isSubmitting}
      >
        <RiArrowLeftLine />
        Voltar
      </Button>

      {isLastStep ? (
        <Button
          onClick={handleFinish}
          loading={isSubmitting}
          disabled={isSubmitting || !document}
        >
          <RiCheckLine />
          Finalizar
        </Button>
      ) : (
        <Button onClick={handleNext} disabled={isSubmitting}>
          Próximo
          <RiArrowRightLine />
        </Button>
      )}
    </HStack>
  )

  return (
    <CustomDrawer
      isOpen
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      title="Criar agente de IA"
      size="xl"
      footer={footer}
    >
      <Stack gap={6}>
        {finishError ? (
          <Text fontSize="sm" color="fg.error">
            {finishError}
          </Text>
        ) : null}
        <Steps.Root
          colorPalette={colorPalette}
          count={STEPS.length}
          step={currentStep}
          size="sm"
        >
          <Steps.List mb={2}>
            {STEPS.map((step, index) => (
              <Steps.Item key={step.label} index={index} title={step.label}>
                <Steps.Indicator />
                <Steps.Title display={{ base: 'none', sm: 'block' }}>
                  {step.label}
                </Steps.Title>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>

          <Steps.Content index={0}>
            <AIAgentWizardStep1 control={step1Form.control} />
          </Steps.Content>

          <Steps.Content index={1}>
            <Stack gap={8}>
              <Stack gap={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Nome da persona
                </Text>
                <Input
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder={agentName || 'Ex: Sofia'}
                />
                {agentName ? (
                  <Text fontSize="xs" color="fg.muted">
                    Sugestão: &quot;{agentName}&quot;
                  </Text>
                ) : null}
              </Stack>

              <HStack gap={4} flexWrap="wrap">
                <Stack gap={1} flex="1" minW="160px">
                  <Text fontWeight="semibold" fontSize="sm">
                    Tom de voz
                  </Text>
                  <select
                    value={voiceTone}
                    onChange={(e) =>
                      setVoiceTone(e.target.value as VoiceToneType)
                    }
                  >
                    <option value="FORMAL">Formal</option>
                    <option value="FRIENDLY">Amigável</option>
                    <option value="NEUTRAL">Neutro</option>
                    <option value="EMPATHETIC">Empático</option>
                    <option value="TECHNICAL">Técnico</option>
                  </select>
                </Stack>
                <Stack gap={1} flex="1" minW="160px">
                  <Text fontWeight="semibold" fontSize="sm">
                    Estilo de comunicação
                  </Text>
                  <select
                    value={communicationStyle}
                    onChange={(e) =>
                      setCommunicationStyle(
                        e.target.value as CommunicationStyleType
                      )
                    }
                  >
                    <option value="CONCISE">Conciso</option>
                    <option value="DETAILED">Detalhado</option>
                    <option value="BALANCED">Equilibrado</option>
                    <option value="INSTRUCTIVE">Instrutivo</option>
                  </select>
                </Stack>
              </HStack>

              {companyId ? (
                <PromptSheetChat
                  companyId={companyId}
                  onDocument={handleDocument}
                  onSuggestedQuestions={setSuggestedQuestions}
                />
              ) : (
                <Text fontSize="sm" color="fg.error">
                  Selecione uma empresa para preencher a ficha.
                </Text>
              )}

              {promptStepError ? (
                <Text fontSize="sm" color="fg.error">
                  {promptStepError}
                </Text>
              ) : null}

              {document ? (
                <>
                  <ReadOnlyPromptDocument document={document} />
                  <PromptTestPanel
                    document={document}
                    suggestedQuestions={suggestedQuestions}
                    proposal={null}
                    onTest={handleTest}
                    isTesting={isTesting}
                  />
                </>
              ) : null}
            </Stack>
          </Steps.Content>

          <Steps.Content index={2}>
            <AIAgentWizardStep3 control={step3Form.control} />
          </Steps.Content>
        </Steps.Root>
      </Stack>
    </CustomDrawer>
  )
}

const AIAgentWizard = memo(AIAgentWizardBase) as typeof AIAgentWizardBase

export { AIAgentWizard, type Props as AIAgentWizardProps }
