import { Button, Flex, HStack, Steps } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'
import { useParams, useSearchParams } from 'react-router-dom'

import { toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useOnboarding } from '@/hooks/queries'

import { Company } from './FormSteps/Company'
import { FormDataProps } from './FormSteps/FormSteps.types'
import { Plan } from './FormSteps/Plan'
import { Resume } from './FormSteps/Resume'
import { Success } from './FormSteps/Success'
import { User } from './FormSteps/User'

const steps = [
  { title: 'Usuário', id: 'user-info' },
  { title: 'Empresa', id: 'company-info' },
  { title: 'Plano', id: 'plan-info' },
] as const

function SelfCreateCompanyForm() {
  const { colorPalette } = useWhiteLabel()

  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const planIdFromUrl = searchParams.get('planId')

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormDataProps | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    setStep(0)
    setData(null)
    setIsSaving(false)
    setIsSuccess(false)
  }, [id])

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

    if (isSaving) return

    setIsSaving(true)

    if (!id) {
      toaster.create({
        title: 'Erro ao salvar',
        description: 'Por favor, informe o ID do parceiro de negócios.',
        type: 'error',
        closable: true,
        duration: 4000,
      })
      return
    }

    try {
      const dataToSave = {
        ...data,
        businessPartnerId: id,
      }

      const response = await createOnboardingMutation.mutateAsync({
        data: dataToSave,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Empresa adicionada com sucesso!',
        type: 'success',
        closable: true,
        duration: 4000,
      })

      setIsSuccess(true)
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
      setIsSaving(false)
    }
  }, [data, id, isSaving, createOnboardingMutation])

  return (
    <Flex
      flexDirection="column"
      gap={6}
      maxW={500}
      minH="100%"
      p={10}
      w="full"
    >
      <Steps.Root
        colorPalette={colorPalette}
        count={steps.length}
        flex={1}
        onStepChange={(e) => setStep(e.step)}
        size="xs"
        step={step}
      >
        {!isSuccess && (
          <Steps.List mb={4}>
            {steps.map((stepItem, index) => (
              <Steps.Item
                index={index}
                key={index}
                title={stepItem.title}
              >
                <Steps.Indicator />
                <Steps.Title display={{ base: 'none', md: 'block' }}>
                  {stepItem.title}
                </Steps.Title>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>
        )}
        <Steps.Content index={0}>
          <User
            formData={data ?? undefined}
            id={0}
            onSubmit={(formValues) => {
              goToNextStep()
              saveData(formValues)
            }}
          />
        </Steps.Content>
        <Steps.Content index={1}>
          <Company
            formData={data ?? undefined}
            id={1}
            onSubmit={(formValues) => {
              goToNextStep()
              saveData(formValues)
            }}
          />
        </Steps.Content>
        <Steps.Content index={2}>
          <Plan
            formData={data ?? undefined}
            id={2}
            planIdFromUrl={planIdFromUrl}
            onSubmit={(formValues) => {
              goToNextStep()
              saveData(formValues)
            }}
          />
        </Steps.Content>
        <Steps.CompletedContent>
          {isSuccess ? <Success /> : <Resume formData={data ?? undefined} />}
        </Steps.CompletedContent>
      </Steps.Root>
      {!isSuccess && (
        <HStack
          justifyContent="flex-end"
          w="full"
        >
          <Button
            disabled={isSaving}
            hidden={step === 0}
            onClick={goToPrevStep}
            variant="surface"
          >
            Voltar
          </Button>
          {step + 1 <= steps.length ? (
            <Button
              disabled={isSaving}
              form={`hook-form-${step}`}
              loading={isSaving}
              type="submit"
            >
              Avançar
            </Button>
          ) : (
            <Button
              disabled={isSaving}
              loading={isSaving}
              loadingText="Salvando..."
              onClick={handleSave}
            >
              <RiSaveLine />
              Enviar cadastro
            </Button>
          )}
        </HStack>
      )}
    </Flex>
  )
}

export { SelfCreateCompanyForm }
