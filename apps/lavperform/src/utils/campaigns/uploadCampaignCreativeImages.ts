import type { CampaignCreative } from '@/components/features/campaigns/recurring-campaign/CreateRecurringCampaignForm/FormSteps/FormSteps.types'
import { uploadFileWithBase64 } from '@/firebase/storage'

function filterValidUrls(urls: string[] | undefined): string[] {
  return (urls ?? []).filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  )
}

/**
 * Faz upload dos base64 pendentes do criativo e devolve URLs em `imageUrls`.
 * `imageUrls` no criativo = URLs a manter; novos uploads são acrescentados ao final.
 * Prioridade: `imageBase64List` (várias imagens) → `image.base64` (uma imagem).
 */
export async function uploadCampaignCreativeImages(
  creative: CampaignCreative
): Promise<CampaignCreative> {
  const keptUrls = filterValidUrls(creative.imageUrls)

  const pendingBase64 =
    creative.imageBase64List && creative.imageBase64List.length > 0
      ? creative.imageBase64List
      : creative.image?.base64
        ? [creative.image.base64]
        : []

  if (pendingBase64.length > 0) {
    const urls = await Promise.all(
      pendingBase64.map((b) => uploadFileWithBase64(b, 'campaigns'))
    )
    const uploaded = filterValidUrls(urls)
    const merged = [...keptUrls, ...uploaded]
    return {
      ...creative,
      image: merged[0] ? { url: merged[0] } : null,
      imageUrls: merged,
      imageBase64List: undefined,
    }
  }

  if (creative.imageUrls !== undefined) {
    return {
      ...creative,
      imageUrls: keptUrls,
      image: keptUrls[0] ? { url: keptUrls[0] } : null,
      imageBase64List: undefined,
    }
  }

  if (creative.image?.url) {
    return {
      ...creative,
      imageUrls: [creative.image.url],
      image: { url: creative.image.url },
      imageBase64List: undefined,
    }
  }

  return {
    ...creative,
    imageUrls: [],
    image: null,
    imageBase64List: undefined,
  }
}
