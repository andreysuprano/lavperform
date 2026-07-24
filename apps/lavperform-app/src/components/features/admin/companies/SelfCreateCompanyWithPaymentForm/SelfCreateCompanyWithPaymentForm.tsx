import { Button, Flex, HStack, Steps } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'
import { useParams } from 'react-router-dom'

import { toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useOnboardingWithPayment } from '@/hooks/queries'

import { Company } from '../SelfCreateCompanyForm/FormSteps/Company'
import {
  FormDataProps,
  OnboardingSuccessState,
} from '../SelfCreateCompanyForm/FormSteps/FormSteps.types'
import { Payment } from '../SelfCreateCompanyForm/FormSteps/Payment'
import { SubscriptionResume } from '../SelfCreateCompanyForm/FormSteps/SubscriptionResume'
import { PaymentSuccess } from '../SelfCreateCompanyForm/FormSteps/PaymentSuccess'
import { User } from '../SelfCreateCompanyForm/FormSteps/User'

const steps = [
  { title: 'Usuário', id: 'user-info' },
  { title: 'Empresa', id: 'company-info' },
  { title: 'Revisão', id: 'review' },
  { title: 'Pagamento', id: 'payment' },
] as const

function SelfCreateCompanyWithPaymentForm() {
  const { colorPalette } = useWhiteLabel()

  const { id } = useParams<{ id?: string }>()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormDataProps | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [successState, setSuccessState] = useState<OnboardingSuccessState>()

  useEffect(() => {
    setStep(0)
    setData(null)
    setIsSaving(false)
    setIsSuccess(false)
    setSuccessState(undefined)
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

  const createOnboardingWithPaymentMutation = useOnboardingWithPayment()

  const handleSave = useCallback(
    async (
      paymentData: FormDataProps & {
        creditCard: NonNullable<FormDataProps['creditCard']>
      }
    ) => {
      if (!paymentData || !data) {
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

      if (!paymentData.creditCard) {
        toaster.create({
          title: 'Erro ao salvar',
          description: 'Informe os dados do cartão de crédito.',
          type: 'error',
          closable: true,
          duration: 4000,
        })
        setIsSaving(false)
        return
      }

      try {
        const response = await createOnboardingWithPaymentMutation.mutateAsync({
          data: {
            name: data.name,
            email: data.email,
            password: data.password,
            phone: data.phone,
            company: data.company,
            ...(id ? { businessPartnerId: id } : {}),
            creditCard: {
              holderName: paymentData.creditCard.holderName,
              number: paymentData.creditCard.number.replace(/\s/g, ''),
              expiryMonth: paymentData.creditCard.expiryMonth,
              expiryYear: `20${paymentData.creditCard.expiryYear}`,
              ccv: paymentData.creditCard.ccv,
            },
            creditCardHolderInfo: {
              name: data.name,
              email: data.email,
              cpfCnpj: data.company.cnpj.replace(/\D/g, ''),
              postalCode: data.company.zipCode.replace(/\D/g, ''),
              addressNumber: data.company.number,
              phone: data.phone.replace(/\D/g, ''),
            },
          },
        })

        setSuccessState({
          accountActivated: response.accountActivated ?? false,
          invoiceUrl: response.payment?.invoiceUrl,
        })

        toaster.create({
          title: response.accountActivated ? 'Conta ativada' : 'Cadastro enviado',
          description:
            response.message ||
            (response.accountActivated
              ? 'Pagamento confirmado com sucesso!'
              : 'Aguardando confirmação do pagamento.'),
          type: response.accountActivated ? 'success' : 'warning',
          closable: true,
          duration: 5000,
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
          'Não foi possível concluir o cadastro.'

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
    },
    [createOnboardingWithPaymentMutation, data, id, isSaving]
  )

  if (isSuccess) {
    return <PaymentSuccess successState={successState} />
  }

  return (
    <Flex
      flexDirection="column"
      gap={{ base: 4, md: 6 }}
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
        <Steps.List mb={{ base: 3, md: 4 }}>
          {steps.map((stepItem, index) => (
            <Steps.Item
              index={index}
              key={index}
              title={stepItem.title}
            >
              <Steps.Indicator />
              <Steps.Title
                display={{ base: 'none', sm: 'block' }}
                fontSize="xs"
              >
                {stepItem.title}
              </Steps.Title>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
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
          <SubscriptionResume formData={data ?? undefined} />
        </Steps.Content>
        <Steps.Content index={3}>
          {step === 3 && data && (
            <Payment
              formData={data}
              id={3}
              key="signup-payment"
              onSubmit={(formValues) => {
                handleSave({
                  ...data,
                  creditCard: formValues.creditCard,
                })
              }}
            />
          )}
        </Steps.Content>
      </Steps.Root>
      <HStack
        bg={{ base: 'bg.panel', md: 'transparent' }}
        borderColor="border.muted"
        borderTopWidth={{ base: '1px', md: 0 }}
        bottom={0}
        gap={3}
        justifyContent="flex-end"
        left={{ base: 0, md: 'auto' }}
        mt={{ base: 0, md: 2 }}
        pb={{ base: 'max(0.75rem, env(safe-area-inset-bottom))', md: 0 }}
        position={{ base: 'sticky', md: 'static' }}
        pt={{ base: 3, md: 0 }}
        px={{ base: 0, md: 0 }}
        right={{ base: 0, md: 'auto' }}
        w="full"
        zIndex={1}
      >
        <Button
          disabled={isSaving}
          hidden={step === 0}
          onClick={goToPrevStep}
          variant="surface"
        >
          Voltar
        </Button>
        {step < 2 ? (
          <Button
            disabled={isSaving}
            form={`hook-form-${step}`}
            loading={isSaving}
            type="submit"
          >
            Avançar
          </Button>
        ) : step === 2 ? (
          <Button
            disabled={isSaving}
            onClick={goToNextStep}
          >
            Ir para pagamento
          </Button>
        ) : (
          <Button
            disabled={isSaving}
            form={`hook-form-${step}`}
            loading={isSaving}
            loadingText="Processando pagamento..."
            type="submit"
          >
            <RiSaveLine />
            Confirmar e pagar
          </Button>
        )}
      </HStack>
    </Flex>
  )
}

export { SelfCreateCompanyWithPaymentForm }
