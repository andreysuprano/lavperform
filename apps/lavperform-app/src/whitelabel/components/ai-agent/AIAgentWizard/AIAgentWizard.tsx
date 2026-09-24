import { Button, HStack, Input, Stack, Steps, Text } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'
import * as yup from 'yup'

import { CustomDrawer } from '@/components'
import { useWhiteLabel } from '@/config'
import {
  useCreateAIAgent,
  useUpdateAIAgentMediaConfig,
  useUpdateAIAgentPersona,
} from '@/whitelabel/hooks'
import { aiAgentService } from '@/whitelabel/services'

import { AIAgentWizardStep1 } from '../AIAgentWizardStep1'
import type { Step1FormData } from '../AIAgentWizardStep1'
import { AIAgentWizardStep3 } from '../AIAgentWizardStep3'
import type { Step3FormData } from '../AIAgentWizardStep3'
import { PromptDocumentEditor } from '../PromptStudio/PromptDocumentEditor'
import { PromptTestPanel } from '../PromptStudio/PromptTestPanel'
import { QuestionnaireForm } from '../PromptStudio/QuestionnaireForm'
import type {
  PromptDocument,
  PromptProposal,
  QuestionnaireAnswers,
} from '../PromptStudio/promptStudio.types'

import type { Props } from './AIAgentWizard.types'

const STEPS = [
  { label: 'Dados básicos', description: 'Nome e descrição' },
  { label: 'Prompt', description: 'Questionário e teste' },
  { label: 'Mídia', description: 'Áudio, imagem e vídeo' },
]

const step1Schema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
})

function AIAgentWizardBase({ onClose }: Props) {
  const { colorPalette } = useWhiteLabel()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [personaName, setPersonaName] = useState('')
  const [questionnaireAnswers, setQuestionnaireAnswers] =
    useState<QuestionnaireAnswers | null>(null)
  const [document, setDocument] = useState<PromptDocument | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [proposal, setProposal] = useState<PromptProposal | null>(null)
  const [draftChanged, setDraftChanged] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isProposing, setIsProposing] = useState(false)
  const [promptStepError, setPromptStepError] = useState<string | null>(null)

  const createAgent = useCreateAIAgent()
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

  const handleGenerate = useCallback(async (answers: QuestionnaireAnswers) => {
    setIsGenerating(true)
    setPromptStepError(null)
    setProposal(null)
    try {
      const response = await aiAgentService.generatePromptStudio(answers)
      setQuestionnaireAnswers(answers)
      setDocument(response.data.document)
      setSuggestedQuestions(response.data.suggestedQuestions)
      setDraftChanged(false)
    } catch {
      setPromptStepError('Não foi possível gerar o prompt. Tente de novo.')
    } finally {
      setIsGenerating(false)
    }
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

  const handlePropose = useCallback(
    async (payload: {
      question: string
      answer: string
      whatWasWrong: string
    }) => {
      if (!document) return
      setIsProposing(true)
      try {
        const response = await aiAgentService.proposePromptStudio({
          document,
          question: payload.question,
          answer: payload.answer,
          whatWasWrong: payload.whatWasWrong,
          currentUpdatedAt: null,
          draftChanged,
        })
        setProposal(response.data)
      } finally {
        setIsProposing(false)
      }
    },
    [document, draftChanged]
  )

  const handleAcceptProposal = useCallback(() => {
    if (!document || !proposal) return
    setDocument({ ...document, ...proposal.changes })
    setProposal(null)
    setDraftChanged(true)
  }, [document, proposal])

  const handleDiscardProposal = useCallback(() => {
    setProposal(null)
  }, [])

  const handleDocumentChange = useCallback((next: PromptDocument) => {
    setDocument(next)
    setDraftChanged(true)
  }, [])

  const handleNext = useCallback(async () => {
    if (currentStep === 0) {
      const valid = await step1Form.trigger()
      if (valid) setCurrentStep(1)
      return
    }
    if (currentStep === 1) {
      if (!document) {
        setPromptStepError(
          'Gere o prompt pelo questionário antes de continuar.'
        )
        return
      }
      setPromptStepError(null)
      setCurrentStep(2)
    }
  }, [currentStep, step1Form, document])

  const handleFinish = useCallback(async () => {
    if (isSubmitting || !document || !questionnaireAnswers) return

    setIsSubmitting(true)
    try {
      const s1 = step1Form.getValues()
      const s3 = step3Form.getValues()
      const name = personaName.trim() || agentName || undefined

      const agent = await createAgent.mutateAsync({
        name: s1.name,
        description: s1.description,
        persona: {
          personaName: name,
          contextPrompt: document.contextPrompt || undefined,
          systemPrompt: document.systemPrompt || undefined,
          voiceTone: questionnaireAnswers.voiceTone,
          communicationStyle: questionnaireAnswers.communicationStyle,
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

      await updatePersona.mutateAsync({
        agentId: agent.id,
        data: {
          personaName: name,
          contextPrompt: document.contextPrompt || undefined,
          systemPrompt: document.systemPrompt || undefined,
          voiceTone: questionnaireAnswers.voiceTone,
          communicationStyle: questionnaireAnswers.communicationStyle,
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

      onClose()
      navigate(`/whitelabel/ai-agent/${agent.id}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    document,
    questionnaireAnswers,
    step1Form,
    step3Form,
    personaName,
    agentName,
    createAgent,
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

              <QuestionnaireForm
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />

              {promptStepError ? (
                <Text fontSize="sm" color="fg.error">
                  {promptStepError}
                </Text>
              ) : null}

              {document ? (
                <>
                  <PromptDocumentEditor
                    document={document}
                    onChange={handleDocumentChange}
                  />
                  <PromptTestPanel
                    document={document}
                    suggestedQuestions={suggestedQuestions}
                    proposal={proposal}
                    onTest={handleTest}
                    onPropose={handlePropose}
                    onAcceptProposal={handleAcceptProposal}
                    onDiscardProposal={handleDiscardProposal}
                    isTesting={isTesting}
                    isProposing={isProposing}
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
