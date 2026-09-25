import {
  Button,
  createListCollection,
  HStack,
  Input,
  Select,
  Stack,
  Steps,
  Text,
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useMemo, useState } from 'react'
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
  PromptProposal,
  VoiceToneType,
} from '@/whitelabel/types'

import { AIAgentWizardStep1 } from '../AIAgentWizardStep1'
import type { Step1FormData } from '../AIAgentWizardStep1'
import { AIAgentWizardStep3 } from '../AIAgentWizardStep3'
import type { Step3FormData } from '../AIAgentWizardStep3'
import { PromptSheetChat } from '../PromptStudio/PromptSheetChat'
import type { AdjustmentSeed } from '../PromptStudio/PromptSheetChat'
import { PromptTestPanel } from '../PromptStudio/PromptTestPanel'

import type { Props } from './AIAgentWizard.types'

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
import {
  advanceFinishResume,
  initialFinishResume,
  nextFinishPhase,
  shouldCreateAgent,
  type FinishResumeState,
} from './wizard-finish-resume'

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
  const voiceToneCollection = useMemo(
    () => createListCollection({ items: voiceToneItems }),
    []
  )
  const communicationStyleCollection = useMemo(
    () => createListCollection({ items: communicationStyleItems }),
    []
  )
  const [document, setDocument] = useState<PromptDocument | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [promptStepError, setPromptStepError] = useState<string | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [finishResume, setFinishResume] =
    useState<FinishResumeState>(initialFinishResume)
  const [adjustmentSeed, setAdjustmentSeed] = useState<AdjustmentSeed | null>(
    null
  )
  const [isProposingFromTest, setIsProposingFromTest] = useState(false)

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

  const handleProposeFromTest = useCallback(async (payload: AdjustmentSeed) => {
    setIsProposingFromTest(true)
    setPromptStepError(null)
    setAdjustmentSeed(payload)
  }, [])

  const handleAcceptAdjustment = useCallback(
    async (proposal: PromptProposal) => {
      setDocument((prev) => (prev ? { ...prev, ...proposal.changes } : prev))
    },
    []
  )

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
    let resume = finishResume
    try {
      const s1 = step1Form.getValues()
      const s3 = step3Form.getValues()
      const name = personaName.trim() || agentName || undefined

      let agentId = resume.agentId

      if (shouldCreateAgent(resume)) {
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
        agentId = created.data.id
        resume = advanceFinishResume(resume, {
          type: 'created',
          agentId,
        })
        setFinishResume(resume)
        invalidateQueries.aiAgentsList(companyId)
      }

      if (!agentId) {
        throw new Error('Agent id missing after create')
      }

      if (nextFinishPhase(resume) === 'adopt') {
        try {
          await aiAgentService.adoptPromptSheet(companyId, agentId)
          resume = advanceFinishResume(resume, { type: 'adopted' })
          setFinishResume(resume)
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
      }

      if (nextFinishPhase(resume) === 'persona') {
        await updatePersona.mutateAsync({
          agentId,
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
        resume = advanceFinishResume(resume, { type: 'personaSaved' })
        setFinishResume(resume)
      }

      if (nextFinishPhase(resume) === 'media') {
        await updateMediaConfig.mutateAsync({
          agentId,
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
        resume = advanceFinishResume(resume, { type: 'mediaSaved' })
        setFinishResume(resume)
      }

      toaster.create({
        title: 'Sucesso',
        description: 'Agente de IA criado com sucesso!',
        type: 'success',
      })
      onClose()
      navigate(`/whitelabel/ai-agent/${agentId}`)
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
    finishResume,
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

              <HStack gap={4} align="flex-start" flexWrap="wrap">
                <Stack gap={1} flex="1" minW="200px">
                  <Text fontWeight="semibold" fontSize="sm">
                    Tom de voz
                  </Text>
                  <Select.Root
                    collection={voiceToneCollection}
                    value={[voiceTone]}
                    onValueChange={({ value }) =>
                      setVoiceTone((value[0] ?? 'FORMAL') as VoiceToneType)
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Selecione o tom de voz" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {voiceToneItems.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Stack>
                <Stack gap={1} flex="1" minW="200px">
                  <Text fontWeight="semibold" fontSize="sm">
                    Estilo de comunicação
                  </Text>
                  <Select.Root
                    collection={communicationStyleCollection}
                    value={[communicationStyle]}
                    onValueChange={({ value }) =>
                      setCommunicationStyle(
                        (value[0] ?? 'BALANCED') as CommunicationStyleType
                      )
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Selecione o estilo" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {communicationStyleItems.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Stack>
              </HStack>

              {companyId ? (
                <PromptSheetChat
                  companyId={companyId}
                  document={document}
                  draftChanged={false}
                  onDocument={handleDocument}
                  onSuggestedQuestions={setSuggestedQuestions}
                  onAcceptProposal={handleAcceptAdjustment}
                  adjustmentSeed={adjustmentSeed}
                  onAdjustmentSeedConsumed={() => {
                    setAdjustmentSeed(null)
                    setIsProposingFromTest(false)
                  }}
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
                    onPropose={handleProposeFromTest}
                    isTesting={isTesting}
                    isProposing={isProposingFromTest}
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
