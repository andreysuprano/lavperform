import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import type {
  AudienceTargetingMode,
  AutomaticCampaignApiChannel,
  CreateAutomaticCampaignCreativeRequest,
  CreateAutomaticCampaignGift,
  CreateAutomaticCampaignRequest,
} from '@/types'
import type {
  CampaignCreative,
  FormDataProps,
} from '@/components/features/campaigns/recurring-campaign/CreateRecurringCampaignForm/FormSteps/FormSteps.types'
import { buildSendScheduleApiFields } from '@/components/features/campaigns/recurring-campaign/sendSchedule.utils'
import { isWhatsAppBusinessApiChannel } from '@/utils/campaigns/isWhatsAppBusinessApiChannel'


function channelKeyToApi(key: ChannelKey): AutomaticCampaignApiChannel {
  return key.toUpperCase() as AutomaticCampaignApiChannel
}

/**
 * Resolve o título de um criativo para exibição no form.
 * Prioridade: title → primeiros 40 chars de description → "Criativo N"
 */
export function resolveCreativeTitleForApi(
  title: string | undefined | null,
  description: string | undefined | null,
  index: number
): string {
  if (title?.trim()) return title.trim()
  if (description?.trim()) return description.trim().slice(0, 40)
  return `Criativo ${index + 1}`
}

/**
 * Converte data no formato YYYY-MM-DD (HTML date input) para ISO 8601.
 * Retorna null se vazio/nulo.
 */
function toApiDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || !dateStr.trim()) return null
  if (dateStr.includes('T')) return dateStr
  return `${dateStr}T00:00:00.000Z`
}

function buildGifts(form: FormDataProps): CreateAutomaticCampaignGift[] {
  const { incitation, discountType, discountPercent, discountCurrency, deliveryRadius } = form

  if (incitation === 'discount') {
    const unit = discountType === 'currency' ? 'currency' : 'percent'
    const value =
      discountType === 'currency' ? (discountCurrency ?? 0) : (discountPercent ?? 0)
    return [{ type: 'discount', unit, value }]
  }

  if (incitation === 'tax') {
    return [{ type: 'tax', unit: 'km', value: deliveryRadius ?? 0 }]
  }

  return []
}

function buildCreatives(
  creatives: CampaignCreative[],
  fallbackMessage: string,
): CreateAutomaticCampaignCreativeRequest[] {
  return creatives.map((c) => {
    const imageUrls = (c.imageUrls ?? []).filter(
      (u): u is string => typeof u === 'string' && u.trim().length > 0
    )
    return {
      id: c.id,
      imageUrls,
      title: c.title?.trim() || undefined,
      message: c.description?.trim() || fallbackMessage,
      link: c.link?.trim() || null,
    }
  })
}

type BuildPayloadParams = {
  form: FormDataProps
  creatives: CampaignCreative[]
  maxDailySends: number
}

/**
 * Constrói o body do POST/PUT de campanha automática a partir dos dados do wizard.
 */
export function buildAutomaticCampaignPayload({
  form,
  creatives,
  maxDailySends,
}: BuildPayloadParams): CreateAutomaticCampaignRequest {
  const channel: AutomaticCampaignApiChannel = form.channels?.[0]
    ? channelKeyToApi(form.channels[0])
    : 'WHATSAPP_WEB'

  const usesOfficialTemplate =
    isWhatsAppBusinessApiChannel(form.channels) && !!form.metaMessageTemplateId

  const segmentationArray =
    form.segmentation?.length ? form.segmentation : (form.target ?? [])
  const segmentation = segmentationArray.join(',')
  const targetingMode: AudienceTargetingMode = form.targetingMode ?? 'RFV'

  const sendSchedule = buildSendScheduleApiFields(
    form.sendScheduleMode ?? 'establishment',
    form.sendTimeStart,
    form.sendTimeEnd,
  )

  if (usesOfficialTemplate) {
    return {
      name: form.name,
      type: form.campaignType,
      channel,
      targetingMode,
      ...(targetingMode === 'AUDIENCE'
        ? { audienceId: form.audienceId ?? null }
        : { segmentation }),
      maxDailySends,
      active: true,
      images: '[]',
      startDate: toApiDate(form.startDate) ?? '',
      endDate: toApiDate(form.endDate),
      messageText: form.messageText?.trim() || '',
      daysOfWeek: form.daysOfWeek ?? [],
      gifts: buildGifts(form),
      couponId: form.couponId ?? null,
      metaMessageTemplateId: form.metaMessageTemplateId ?? null,
      metaTemplateVariableMappings: form.metaTemplateVariableMappings ?? [],
      ...sendSchedule,
    }
  }

  const messageText =
    creatives[0]?.description?.trim() || form.messageText?.trim() || ''

  const apiCreatives = buildCreatives(creatives, messageText)
  const allImageUrls = apiCreatives.flatMap((c) => c.imageUrls)
  const images = JSON.stringify(allImageUrls)

  return {
    name: form.name,
    type: form.campaignType,
    channel,
    targetingMode,
    ...(targetingMode === 'AUDIENCE'
      ? { audienceId: form.audienceId ?? null }
      : { segmentation }),
    maxDailySends,
    active: true,
    images,
    startDate: toApiDate(form.startDate) ?? '',
    endDate: toApiDate(form.endDate),
    messageText,
    daysOfWeek: form.daysOfWeek ?? [],
    gifts: buildGifts(form),
    creatives: apiCreatives,
    couponId: form.couponId ?? null,
    ...sendSchedule,
  }
}
