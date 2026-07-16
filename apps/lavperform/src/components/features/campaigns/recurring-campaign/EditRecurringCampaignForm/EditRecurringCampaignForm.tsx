import { Button, Steps } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'

import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import { CustomDrawer, LoadingState, toaster } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useCampaign, useUpdateCampaign } from '@/hooks/queries'
import type { RecurringCampaign, RecurringCampaignCreative } from '@/types'
import {
  buildAutomaticCampaignPayload,
  resolveCreativeTitleForApi,
} from '@/utils/campaigns/buildAutomaticCampaignPayload'
import { isWhatsAppBusinessApiChannel } from '@/utils/campaigns/isWhatsAppBusinessApiChannel'
import { uploadCampaignCreativeImages } from '@/utils/campaigns/uploadCampaignCreativeImages'
import { toHtmlDateInputValue } from '@/utils/date'
import { logger } from '@/utils/logger'
import { WEEKDAYS } from '@/utils/weekdays'

import { DEFAULT_MAX_DAILY_SENDS } from '../constants'
import { inferSendScheduleMode } from '../sendSchedule.utils'
import { CardResume } from '../CreateRecurringCampaignForm/CardResume'
import { Channels } from '../CreateRecurringCampaignForm/FormSteps/Channels'
import { Creative } from '../CreateRecurringCampaignForm/FormSteps/Creative'
import { Details } from '../CreateRecurringCampaignForm/FormSteps/Details'
import type {
  CampaignCreative,
  FormDataProps,
} from '../CreateRecurringCampaignForm/FormSteps/FormSteps.types'
import { Resume } from '../CreateRecurringCampaignForm/FormSteps/Resume'
import { SelectType } from '../CreateRecurringCampaignForm/FormSteps/SelectType'
import { TemplateStep } from '../CreateRecurringCampaignForm/FormSteps/TemplateStep'

type Props = {
  campaignData?: RecurringCampaign
  onClose?: () => void
}

const baseSteps = [
  { title: 'Tipo', id: 'campaign-type' },
  { title: 'Detalhes', id: 'campaign-details' },
  { title: 'Canal', id: 'campaign-channels' },
  { title: 'Criativo', id: 'campaign-creative' },
]

function parseImagesField(images: string | null | undefined): string[] {
  if (!images) return []
  const raw = String(images).trim()
  if (!raw) return []

  // Formato novo: JSON stringificado de string[]
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((s) => s.trim()).filter(Boolean)
      }
    } catch {
      // cai no fallback abaixo
    }
  }

  // Formato legado: "url1, url2"
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function mapApiCreativesToForm(
  api: RecurringCampaignCreative[] | undefined,
  fallbackImageUrls: string[],
  messageText: string
): CampaignCreative[] {
  if (api && api.length > 0) {
    return api.map((c, i) => {
      const anyC = c as unknown as {
        imageUrl?: string | null
        imageUrls?: string[] | null
      }
      const urlsFromApi =
        Array.isArray(anyC.imageUrls) && anyC.imageUrls.length > 0
          ? anyC.imageUrls.filter(Boolean)
          : anyC.imageUrl
          ? [anyC.imageUrl]
          : []

      // Legado: algumas campanhas tinham imagens só no campo `images`
      const finalUrls =
        urlsFromApi.length > 0
          ? urlsFromApi
          : i === 0 && fallbackImageUrls.length > 0
            ? fallbackImageUrls
            : fallbackImageUrls[i]
              ? [fallbackImageUrls[i]]
              : []

      const firstUrl = finalUrls[0]
      const creativeText = c.message?.trim() || messageText?.trim() || ''

      return {
        id: c.id ?? `creative-${i}`,
        image: firstUrl ? { url: firstUrl } : null,
        imageUrls: finalUrls,
        title: resolveCreativeTitleForApi(c.title, creativeText, i),
        description: creativeText,
        link: c.link ?? '',
      }
    })
  }
  if (fallbackImageUrls.length > 0) {
    return fallbackImageUrls.map((url, i) => ({
      id: `legacy-img-${i}`,
      image: { url },
      imageUrls: [url],
      title: resolveCreativeTitleForApi(undefined, messageText || '', i),
      description: messageText || '',
      link: '',
    }))
  }
  return []
}

const reverseDayShortToValue = Object.fromEntries(
  WEEKDAYS.map((d) => [d.short, d.value] as const)
)

function mapCampaignToFormData(campaignData: RecurringCampaign): FormDataProps {
  const imagesArray = parseImagesField(campaignData.images)

  const segmentationArray = campaignData.segmentation
    ? campaignData.segmentation
        .split(',')
        .map((seg) => seg.trim())
        .filter(Boolean)
    : []

  let couponId =
    typeof campaignData.couponId === 'string' &&
    campaignData.couponId.trim().length > 0
      ? campaignData.couponId.trim()
      : null

  const firstGift = campaignData.gifts?.[0]
  const hasIncentiveGift =
    firstGift &&
    (firstGift.type === 'tax' || firstGift.type === 'discount')

  if (couponId && hasIncentiveGift) {
    couponId = null
  }

  let incitation: FormDataProps['incitation'] = 'none'
  if (hasIncentiveGift && firstGift) {
    incitation = firstGift.type
  } else if (couponId) {
    incitation = 'none'
  }

  const discountType: FormDataProps['discountType'] =
    incitation !== 'discount'
      ? undefined
      : firstGift?.unit === 'currency'
        ? 'currency'
        : 'percent'

  const discountPercent =
    incitation === 'discount' && discountType === 'percent'
      ? firstGift?.value || 0
      : 0
  const discountCurrency =
    incitation === 'discount' && discountType === 'currency'
      ? firstGift?.value || 0
      : 0
  const deliveryRadius = incitation === 'tax' ? firstGift?.value || 0 : 0

  const creatives = mapApiCreativesToForm(
    campaignData.creatives,
    imagesArray,
    campaignData.messageText || ''
  )

  const channelsFromApi: ChannelKey[] =
    campaignData.channels?.length
      ? (campaignData.channels as ChannelKey[])
      : campaignData.channel
        ? [campaignData.channel.toLowerCase() as ChannelKey]
        : []
  const channels: ChannelKey[] =
    channelsFromApi.length > 0 ? [channelsFromApi[0]] : []

  const selectedDaysFromApi =
    campaignData.daysOfWeek
      ?.map((short) => reverseDayShortToValue[short])
      .filter((n): n is number => typeof n === 'number') ?? []

  const selectedDays =
    selectedDaysFromApi.length > 0
      ? selectedDaysFromApi
      : [1, 2, 3, 4, 5, 6, 7]

  const emptyFiles = new DataTransfer().files

  return {
    campaignType: campaignData.type,
    messageText: campaignData.messageText || '',
    deliveryRadius,
    discountCurrency,
    discountPercent,
    discountType,
    endDate:
      campaignData.endDate != null &&
      String(campaignData.endDate).trim() !== ''
        ? toHtmlDateInputValue(campaignData.endDate)
        : null,
    images: emptyFiles,
    imagesBase64: [] as [],
    incitation,
    maxDailySends: campaignData.maxDailySends ?? DEFAULT_MAX_DAILY_SENDS,
    name: campaignData.name || '',
    segmentation: segmentationArray,
    daysOfWeek: campaignData.daysOfWeek || [],
    startDate: toHtmlDateInputValue(campaignData.startDate),
    selectedDays,
    target: [],
    creatives,
    channels,
    couponId,
    sendScheduleMode: inferSendScheduleMode(
      campaignData.sendTimeStart,
      campaignData.sendTimeEnd,
    ),
    sendTimeStart: campaignData.sendTimeStart ?? null,
    sendTimeEnd: campaignData.sendTimeEnd ?? null,
    metaMessageTemplateId: campaignData.metaMessageTemplateId ?? null,
    metaTemplateVariableMappings: campaignData.metaTemplateVariableMappings ?? [],
  }
}

const EditRecurringCampaignFormComponent = ({
  campaignData,
  onClose,
}: Props) => {
  const { colorPalette } = useWhiteLabel()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormDataProps | null>(null)
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreativeFormOpen, setIsCreativeFormOpen] = useState(false)

  const { selectedCompany } = useAuth()
  const updateCampaignMutation = useUpdateCampaign()

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

  const campaignId = campaignData?.id
  const companyId = selectedCompany?.id

  const {
    data: fetchedCampaign,
    isError: isCampaignError,
  } = useCampaign(campaignId, companyId)

  const openCampaignIdRef = useRef<string | null>(null)
  const detailHydratedRef = useRef(false)
  const creativesDirtyRef = useRef(false)

  useEffect(() => {
    if (campaignData) {
      setStep(0)
      setOpen(true)
    } else {
      setData(null)
      setStep(0)
      setOpen(false)
      openCampaignIdRef.current = null
      detailHydratedRef.current = false
      creativesDirtyRef.current = false
      setIsCreativeFormOpen(false)
    }
  }, [campaignData])

  useEffect(() => {
    if (!campaignData?.id) return

    if (openCampaignIdRef.current !== campaignData.id) {
      openCampaignIdRef.current = campaignData.id
      detailHydratedRef.current = false
      creativesDirtyRef.current = false
      setData(mapCampaignToFormData(campaignData))
    }
  }, [campaignData])

  useEffect(() => {
    if (!campaignData?.id || !fetchedCampaign || creativesDirtyRef.current) return
    if (openCampaignIdRef.current !== campaignData.id) return
    if (detailHydratedRef.current) return

    setData(mapCampaignToFormData(fetchedCampaign))
    detailHydratedRef.current = true
  }, [campaignData?.id, fetchedCampaign])

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
    openCampaignIdRef.current = null
    detailHydratedRef.current = false
    creativesDirtyRef.current = false
    setIsCreativeFormOpen(false)
    onClose?.()
  }

  function saveData(payload: object) {
    setData((prev) => ({ ...prev, ...payload } as FormDataProps))
  }

  const handleCreativesChange = useCallback((creatives: CampaignCreative[]) => {
    creativesDirtyRef.current = true
    setData((prev) => ({ ...prev, creatives } as FormDataProps))
  }, [])

  const handleSave = async () => {
    if (!selectedCompany || !campaignId) return null

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

      logger.info('Atualizar campanha automática', {
        campaignId,
        keys: Object.keys(dataModify),
      })

      const response = await updateCampaignMutation.mutateAsync({
        companyId: selectedCompany.id,
        data: dataModify,
        campaignId,
      })

      toaster.create({
        title: 'Sucesso',
        description: response.message || 'Campanha editada com sucesso!',
        type: 'success',
        closable: true,
        duration: 2000,
      })

      handleClose()
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } }
        message?: string
      }

      const apiMessage = err?.response?.data?.message
      const errorMessage =
        (Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage) ||
        err?.message ||
        'Não foi possível editar a campanha.'

      toaster.dismiss()

      toaster.create({
        title: 'Erro ao editar campanha',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 6000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isFormLoading = !!campaignData && !data

  return (
    <CustomDrawer
      closeTrigger
      footer={
        <>
          <Button
            disabled={isSaving || isFormLoading}
            hidden={step === 0}
            onClick={goToPrevStep}
            variant="surface"
          >
            Voltar
          </Button>
          {step + 1 <= steps.length ? (
            <Button
              disabled={
                isSaving ||
                isFormLoading ||
                (step === 3 && isCreativeFormOpen)
              }
              form={`hook-form-${step}`}
              type="submit"
            >
              Avançar
            </Button>
          ) : (
            <Button
              disabled={isSaving || isFormLoading}
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
      title="Editar campanha"
    >
      {isCampaignError && !data ? (
        <LoadingState title="Não foi possível carregar os dados da campanha." />
      ) : isFormLoading || !data ? (
        <LoadingState title="Carregando campanha..." />
      ) : (
        <Steps.Root
        colorPalette={colorPalette}
        count={steps.length}
        onStepChange={(e) => setStep(e.step)}
        size="xs"
        step={step}
      >
        <Steps.List mb={4}>
          {steps.map((s, index) => (
            <Steps.Item
              index={index}
              key={s.id}
              title={s.title}
            >
              <Steps.Indicator />
              <Steps.Title display={{ base: 'none', md: 'block' }}>
                {s.title}
              </Steps.Title>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
        <CardResume
          formData={data}
          id={step}
        />
        <Steps.Content index={0}>
          <SelectType
            formData={data}
            id={0}
            onSubmit={(payload) => {
              goToNextStep()
              saveData(payload)
            }}
            wizardContext="edit"
          />
        </Steps.Content>
        <Steps.Content index={1}>
          <Details
            formData={data}
            id={1}
            onSubmit={(payload) => {
              goToNextStep()
              saveData(payload)
            }}
            wizardContext="edit"
          />
        </Steps.Content>
        <Steps.Content index={2}>
          <Channels
            formData={data}
            id={2}
            onSubmit={(payload) => {
              goToNextStep()
              saveData(payload)
            }}
            wizardContext="edit"
          />
        </Steps.Content>
        <Steps.Content index={3}>
          {usesOfficialTemplate ? (
            <TemplateStep
              formData={data}
              id={3}
              onSubmit={(payload) => {
                goToNextStep()
                saveData(payload)
              }}
              wizardContext="edit"
            />
          ) : (
            <Creative
              formData={data}
              id={3}
              onCreativesChange={handleCreativesChange}
              onEditingStateChange={setIsCreativeFormOpen}
              onSubmit={(payload) => {
                goToNextStep()
                saveData(payload)
              }}
              wizardContext="edit"
            />
          )}
        </Steps.Content>
        <Steps.CompletedContent>
          <Resume formData={data} />
        </Steps.CompletedContent>
      </Steps.Root>
      )}
    </CustomDrawer>
  )
}

const EditRecurringCampaignForm = memo(EditRecurringCampaignFormComponent)

export {
  EditRecurringCampaignForm,
  type Props as EditRecurringCampaignFormProps,
}
