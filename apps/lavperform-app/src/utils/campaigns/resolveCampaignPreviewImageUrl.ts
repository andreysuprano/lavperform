import type { MetaMessageTemplate } from '@/types/metaTemplate.types'
import type { RecurringCampaign, RecurringCampaignCreative } from '@/types'

function isValidImageUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    (value.trim().startsWith('http://') || value.trim().startsWith('https://'))
  )
}

export function parseCampaignImagesField(
  images: string | null | undefined,
): string[] {
  if (!images) return []
  const raw = String(images).trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.trim()).filter(Boolean)
      }
    } catch {
      // fallback abaixo
    }
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

type ResolveCampaignPreviewImageUrlInput = {
  creatives?: RecurringCampaignCreative[]
  images?: string | null
  metaMessageTemplateId?: string | null
  metaTemplates?: MetaMessageTemplate[]
}

export function resolveCampaignPreviewImageUrl({
  creatives,
  images,
  metaMessageTemplateId,
  metaTemplates,
}: ResolveCampaignPreviewImageUrlInput): string | null {
  const fromCreative = creatives
    ?.flatMap((creative) => creative.imageUrls ?? [])
    .find(isValidImageUrl)

  if (fromCreative) return fromCreative.trim()

  const parsedImages = parseCampaignImagesField(images)
  const fromImagesField = parsedImages.find(isValidImageUrl)
  if (fromImagesField) return fromImagesField.trim()

  if (metaMessageTemplateId && metaTemplates?.length) {
    const template = metaTemplates.find(
      (item) => item.id === metaMessageTemplateId,
    )
    if (template?.headerMediaUrl && isValidImageUrl(template.headerMediaUrl)) {
      return template.headerMediaUrl.trim()
    }
  }

  return null
}
