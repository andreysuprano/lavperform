import { Button, Steps } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { RiAddLine, RiSaveLine } from 'react-icons/ri'

import { CustomDrawer, toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useCreateCampaign } from '@/hooks/queries'
import { buildAutomaticCampaignPayload } from '@/utils/campaigns/buildAutomaticCampaignPayload'
import { isWhatsAppBusinessApiChannel } from '@/utils/campaigns/isWhatsAppBusinessApiChannel'
import { uploadCampaignCreativeImages } from '@/utils/campaigns/uploadCampaignCreativeImages'

import { DEFAULT_MAX_DAILY_SENDS } from '../constants'
import { CardResume } from './CardResume'
import { Channels } from './FormSteps/Channels'
import { Creative } from './FormSteps/Creative'
import { Details } from './FormSteps/Details'
import { FormDataProps, CampaignCreative } from './FormSteps/FormSteps.types'
import { Resume } from './FormSteps/Resume'
import { SelectType } from './FormSteps/SelectType'
import { TemplateStep } from './FormSteps/TemplateStep'

type Props = {
  onClose?: () => void
}

const baseSteps = [
  { title: 'Tipo', id: 'campaign-type' },
  { title: 'Detalhes', id: 'campaign-details' },
  { title: 'Canal', id: 'campaign-channels' },
  { title: 'Criativo', id: 'campaign-creative' },
]

const CreateRecurringCampaignFormComponent = ({ onClose }: Props) => {
  const { colorPalette } = useWhiteLabel()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormDataProps | null>(null)
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreativeFormOpen, setIsCreativeFormOpen] = useState(false)

  const { selectedCompany } = useAuth()
  const createCampaignMutation = useCreateCampaign()

  const usesOfficialTemplate = isWhatsAppBusinessApiChannel(data?.channels)
  const steps = useMemo(
    () =>
      baseSteps.map((stepItem, index) =>
        index === 3 && usesOfficialTemplate
          ? { ...stepItem, title: 'Template', id: 'campaign-template' }
          : stepItem,
      ),
    [usesOfficialTemplate],
  )

  const goToPrevStep = () => {
    setStep(step - 1)
  }

  const goToNextStep = () => {
    setStep(step + 1)
  }

  function handleClose() {
    setStep(0)
    setData(null)
    setOpen(false)
    setIsSaving(false)
    onClose?.()
  }

  function saveData(data: object) {
    setData((prev) => ({ ...prev, ...data } as FormDataProps))
  }

  const handleCreativesChange = useCallback((creatives: CampaignCreative[]) => {
    setData((prev) => ({ ...prev, creatives } as FormDataProps))
  }, [])

  const handleSave = async () => {
    if (!selectedCompany) return null

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

    try {
      const usesTemplate = isWhatsAppBusinessApiChannel(data.channels)

      if (usesTemplate) {
        if (!data.metaMessageTemplateId) {
          toaster.create({
            title: 'Template obrigatório',
            description: 'Selecione um template Meta aprovado para salvar a campanha.',
            type: 'error',
            closable: true,
            duration: 4000,
          })
          return
        }
      } else {
        const creatives = data.creatives ?? []

        if (creatives.length < 1) {
          toaster.create({
            title: 'Criativos obrigatórios',
            description: 'Adicione pelo menos 1 criativo para salvar a campanha.',
            type: 'error',
            closable: true,
            duration: 4000,
          })
          return
        }
      }

      const creatives = data.creatives ?? []
      const creativesWithUploads = usesTemplate
        ? []
        : await Promise.all(
            creatives.map((creative) => uploadCampaignCreativeImages(creative))
          )

      const formPayload: FormDataProps = {
        ...data,
        creatives: creativesWithUploads,
        segmentation:
          data.segmentation?.length && data.segmentation.length > 0
            ? data.segmentation
            : (data.target ?? []),
      }

      const dataModify = buildAutomaticCampaignPayload({
        form: formPayload,
        creatives: creativesWithUploads,
        maxDailySends: data.maxDailySends ?? DEFAULT_MAX_DAILY_SENDS,
      })

      const response = await createCampaignMutation.mutateAsync({
        companyId: selectedCompany.id,
        data: dataModify,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Campanha adicionada com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      // Fecha a modal após sucesso
      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } }
        message?: string
      }

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível adicionar a campanha.'

      toaster.dismiss() // Remove qualquer toast de loading

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
  }

  return (
    <CustomDrawer
      closeTrigger
      footer={
        <>
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
              disabled={isSaving || (step === 3 && isCreativeFormOpen)}
              form={`hook-form-${step}`}
              type="submit"
            >
              Avançar
            </Button>
          ) : (
            <Button
              disabled={isSaving}
              loading={isSaving}
              loadingText="Salvando campanha..."
              onClick={handleSave}
            >
              <RiSaveLine />
              Salvar campanha
            </Button>
          )}
        </>
      }
      isOpen={open}
      lazyMount
      onExitComplete={handleClose}
      onOpenChange={(e) => setOpen(e.open)}
      size="xl"
      title="Nova campanha"
      trigger={
        <Button
          size="sm"
          w={{ base: 'full', md: 'auto' }}
        >
          <RiAddLine />
          Nova campanha
        </Button>
      }
    >
      <Steps.Root
        colorPalette={colorPalette}
        count={steps.length}
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
        <CardResume
          formData={data ?? undefined}
          id={step}
        />
        <Steps.Content index={0}>
          <SelectType
            id={0}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.Content index={1}>
          <Details
            formData={data ?? undefined}
            id={1}
            onSubmit={(data) => {
              goToNextStep()
              saveData(data)
            }}
          />
        </Steps.Content>
        <Steps.Content index={2}>
          <Channels
            formData={data ?? undefined}
            id={2}
            onSubmit={(payload) => {
              goToNextStep()
              saveData(payload)
            }}
          />
        </Steps.Content>
        <Steps.Content index={3}>
          {usesOfficialTemplate ? (
            <TemplateStep
              formData={data ?? undefined}
              id={3}
              onSubmit={(payload) => {
                goToNextStep()
                saveData(payload)
              }}
            />
          ) : (
            <Creative
              formData={data ?? undefined}
              id={3}
              onCreativesChange={handleCreativesChange}
              onEditingStateChange={setIsCreativeFormOpen}
              onSubmit={(payload) => {
                goToNextStep()
                saveData(payload)
              }}
            />
          )}
        </Steps.Content>
        <Steps.CompletedContent>
          <Resume formData={data ?? undefined} />
        </Steps.CompletedContent>
      </Steps.Root>
    </CustomDrawer>
  )
}

const CreateRecurringCampaignForm = memo(CreateRecurringCampaignFormComponent)

export {
  CreateRecurringCampaignForm,
  type Props as CreateRecurringCampaignFormProps,
}
