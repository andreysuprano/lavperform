import { Button, HStack, Stack, Steps } from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { memo, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { RiArrowLeftLine, RiArrowRightLine, RiCheckLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'
import * as yup from 'yup'

import { CustomDrawer } from '@/components'
import { useWhiteLabel } from '@/config'
import {
  DEFAULT_BEHAVIOR_GUIDELINES,
  DEFAULT_GUARDRAILS,
} from '@/whitelabel/constants/aiAgentPersonaDefaults'
import {
  useCreateAIAgent,
  useUpdateAIAgentMediaConfig,
  useUpdateAIAgentPersona,
} from '@/whitelabel/hooks'

import { AIAgentWizardStep1 } from '../AIAgentWizardStep1'
import type { Step1FormData } from '../AIAgentWizardStep1'
import { AIAgentWizardStep2 } from '../AIAgentWizardStep2'
import type { Step2FormData } from '../AIAgentWizardStep2'
import { AIAgentWizardStep3 } from '../AIAgentWizardStep3'
import type { Step3FormData } from '../AIAgentWizardStep3'

import type { Props } from './AIAgentWizard.types'

const STEPS = [
  { label: 'Dados básicos', description: 'Nome e descrição' },
  { label: 'Persona', description: 'Inteligência e estilo' },
  { label: 'Mídia', description: 'Áudio, imagem e vídeo' },
]

const step1Schema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
})

const step2Schema = yup.object({
  personaName: yup.string(),
  systemPrompt: yup.string(),
  voiceTone: yup.string().required('Tom de voz é obrigatório'),
  communicationStyle: yup
    .string()
    .required('Estilo de comunicação é obrigatório'),
  language: yup.string(),
  behaviorGuidelines: yup.string(),
  guardrails: yup.string(),
})

function AIAgentWizardBase({ onClose }: Props) {
  const { colorPalette } = useWhiteLabel()
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createAgent = useCreateAIAgent()
  const updatePersona = useUpdateAIAgentPersona()
  const updateMediaConfig = useUpdateAIAgentMediaConfig()

  const step1Form = useForm<Step1FormData>({
    resolver: yupResolver(step1Schema),
    defaultValues: { name: '', description: '' },
  })

  const step2Form = useForm<Step2FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(step2Schema) as any,
    defaultValues: {
      personaName: '',
      systemPrompt: '',
      voiceTone: 'FORMAL',
      communicationStyle: 'BALANCED',
      language: 'PT_BR',
      behaviorGuidelines: DEFAULT_BEHAVIOR_GUIDELINES,
      guardrails: DEFAULT_GUARDRAILS,
    },
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

  const handleNext = useCallback(async () => {
    if (currentStep === 0) {
      const valid = await step1Form.trigger()
      if (valid) setCurrentStep(1)
      return
    }
    if (currentStep === 1) {
      const valid = await step2Form.trigger()
      if (valid) setCurrentStep(2)
    }
  }, [currentStep, step1Form, step2Form])

  const handleFinish = useCallback(async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const s1 = step1Form.getValues()
      const s2 = step2Form.getValues()
      const s3 = step3Form.getValues()

      const agent = await createAgent.mutateAsync({
        name: s1.name,
        description: s1.description,
        persona: {
          personaName: s2.personaName || undefined,
          systemPrompt: s2.systemPrompt || undefined,
          voiceTone: s2.voiceTone,
          communicationStyle: s2.communicationStyle,
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
          personaName: s2.personaName || undefined,
          systemPrompt: s2.systemPrompt || undefined,
          voiceTone: s2.voiceTone,
          communicationStyle: s2.communicationStyle,
          language: 'PT_BR',
          behaviorGuidelines: s2.behaviorGuidelines,
          guardrails: s2.guardrails,
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
    step1Form,
    step2Form,
    step3Form,
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
          disabled={isSubmitting}
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
            <AIAgentWizardStep2
              control={step2Form.control}
              agentName={agentName}
            />
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
