import { Button, Steps } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useOnboarding } from '@/hooks/queries'

import { Company } from './FormSteps/Company'
import { FormDataProps } from './FormSteps/FormSteps.types'
import { Partner } from './FormSteps/Partner'
import { Plan } from './FormSteps/Plan'
import { Resume } from './FormSteps/Resume'
import { User } from './FormSteps/User'

const steps = [
  { title: 'Usuário', id: 'user-info' },
  { title: 'Empresa', id: 'company-info' },
  { title: 'Plano', id: 'plan-info' },
  { title: 'Parceiro', id: 'partner-info' },
] as const

export function CreateCompanyForm() {
  const { colorPalette } = useWhiteLabel()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormDataProps | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setStep(0)
    setData(null)
    setIsSubmitting(false)
  }, [])

  const goToPrevStep = useCallback(() => {
    setStep((prev) => prev - 1)
  }, [])

  const goToNextStep = useCallback(() => {
    setStep((prev) => prev + 1)
  }, [])

  const saveData = useCallback((newData: object) => {
    setData((prev) => ({ ...prev, ...newData } as FormDataProps))
  }, [])

  const createOnboardingMutation = useOnboarding()

  const handleSave = useCallback(async () => {
    if (!data) {
      toaster.create({
        title: 'Erro ao salvar',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        type: 'error',
        closable: true,
        duration: 4000,
      })
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await createOnboardingMutation.mutateAsync({
        data,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Empresa adicionada com sucesso!',
        type: 'success',
        closable: true,
        duration: 4000,
      })

      setIsOpen(false)
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível adicionar a empresa.'

      toaster.dismiss()

      toaster.create({
        title: 'Erro ao salvar',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [data, isSubmitting, setIsOpen, createOnboardingMutation])

  return (
    <CustomDrawer
      footer={
        <>
          <Button
            disabled={isSubmitting || step === 0}
            hidden={step === 0}
            onClick={goToPrevStep}
            variant="surface"
          >
            Voltar
          </Button>
          {step + 1 <= steps.length ? (
            <Button
              disabled={isSubmitting}
              form={`hook-form-${step}`}
              loading={isSubmitting}
              type="submit"
            >
              Avançar
            </Button>
          ) : (
            <Button
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Salvando..."
              onClick={handleSave}
            >
              <RiSaveLine />
              Salvar cadastro
            </Button>
          )}
        </>
      }
      isOpen={isOpen}
      onOpenChange={(e) => setIsOpen(e.open)}
      size="lg"
      title="Adicionar nova empresa"
      trigger={
        <Button w={{ base: 'full', md: 'auto' }}>
          <RiAddLine />
          Adicionar
        </Button>
      }
    >
      <Steps.Root
        colorPalette={colorPalette}
        count={steps.length}
        flex={1}
        onStepChange={(e) => setStep(e.step)}
        size="xs"
        step={step}
      >
        <Steps.List mb={4}>
          {steps.map((step, index) => (
            <Steps.Item
              index={index}
              key={index}
              title={step.title}
            >
              <Steps.Indicator />
              <Steps.Title display={{ base: 'none', md: 'block' }}>
                {step.title}
              </Steps.Title>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
        <Steps.Content index={0}>
          <User
            formData={data ?? undefined}
            id={0}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.Content index={1}>
          <Company
            formData={data ?? undefined}
            id={1}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.Content index={2}>
          <Plan
            formData={data ?? undefined}
            id={2}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.Content index={3}>
          <Partner
            formData={data ?? undefined}
            id={3}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.CompletedContent>
          <Resume formData={data ?? undefined} />
        </Steps.CompletedContent>
      </Steps.Root>
    </CustomDrawer>
  )
}
