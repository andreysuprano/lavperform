import type { AudienceTargetingMode, AutomaticCampaignType } from '@/types'

export interface FormDataProps {
  campaignType: AutomaticCampaignType
  /**
   * Comunicação passa a ser por-criativo (description).
   * Mantemos opcional temporariamente para não quebrar payloads legados.
   */
  messageText?: string
  deliveryRadius: number
  discountCurrency: number
  discountPercent: number
  discountType?: 'percent' | 'currency'
  endDate: string | null
  images: FileList
  imagesBase64: []
  creatives?: CampaignCreative[]
  incitation: 'discount' | 'tax' | 'none'
  maxDailySends: number
  name: string
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  customSendListId?: string | null
  segmentation: string[]
  daysOfWeek: string[]
  startDate: string
  target: string[]
  selectedDays?: number[]
  channels?: import('@/components/features/channels/channelCatalog.constants').ChannelKey[]
  /** Back aceita 1 cupom; seleção feita no step Benefícios. */
  couponId?: string | null
  sendScheduleMode?: import('../../sendSchedule.utils').SendScheduleMode
  sendTimeStart?: string | null
  sendTimeEnd?: string | null
  /** Campanha API Oficial: template Meta selecionado em vez de criativos. */
  metaMessageTemplateId?: string | null
  metaTemplateVariableMappings?: import('@/utils/campaigns/metaTemplateVariable.constants').MetaTemplateVariableMapping[]
  selectedMetaTemplateLabel?: string
}

export type CampaignCreative = {
  id: string
  image?: { base64?: string; url?: string } | null
  /** URLs após upload (1+ imagens; enviadas no payload como `imageUrls`). */
  imageUrls?: string[]
  /**
   * Base64 de todas as imagens selecionadas no form (antes do upload).
   * O primeiro item espelha `image.base64` para preview no card.
   */
  imageBase64List?: string[]
  title?: string
  description?: string
  link?: string
}

/** Payload tipado do passo Criativo ao avançar no wizard. */
export type CreativeStepSubmitPayload = Pick<FormDataProps, 'creatives'>

/** Payload tipado do passo Template (API Oficial) ao avançar no wizard. */
export type TemplateStepSubmitPayload = Pick<
  FormDataProps,
  | 'metaMessageTemplateId'
  | 'metaTemplateVariableMappings'
  | 'selectedMetaTemplateLabel'
  | 'messageText'
  | 'creatives'
>

export interface FormStepsProps {
  id?: number
  wizardFormId?: string
  onSubmit?: (data: Partial<FormDataProps>) => void
  formData?: FormDataProps
  /** Em `edit`, sincroniza criativos com o wizard ao atualizar um criativo. */
  onCreativesChange?: (creatives: CampaignCreative[]) => void
  /** Notifica quando o painel de edição/criação de criativo abre ou fecha. */
  onEditingStateChange?: (isEditing: boolean) => void
  /** Em `edit`, passos usam dados pré-preenchidos e regras/textos de edição. */
  wizardContext?: 'create' | 'edit'
}
