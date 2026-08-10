export interface LocationItem {
  placeName: string
  address: string
  mapUrl: string
  mapEmbedUrl: string
  googleMapsLink: string
}

export interface LocationData {
  title: string
  description: string
  items: LocationItem[]
}

/**
 * Converte formato legado (campos planos) para `items[]`,
 * igual ao fluxo do lavperform-app whitelabel.
 */
export function normalizeLocationData(raw: unknown): LocationData {
  if (!raw || typeof raw !== 'object') {
    return { title: '', description: '', items: [] }
  }

  const data = raw as Record<string, unknown>

  if (Array.isArray(data.items)) {
    const items = data.items
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        placeName: String(item.placeName ?? ''),
        address: String(item.address ?? ''),
        mapUrl: String(item.mapUrl ?? ''),
        mapEmbedUrl: String(item.mapEmbedUrl ?? ''),
        googleMapsLink: String(item.googleMapsLink ?? ''),
      }))

    return {
      title: String(data.title ?? ''),
      description: String(data.description ?? ''),
      items,
    }
  }

  const legacyItem: LocationItem = {
    placeName: String(data.placeName ?? ''),
    address: String(data.address ?? ''),
    mapUrl: String(data.mapUrl ?? ''),
    mapEmbedUrl: String(data.mapEmbedUrl ?? ''),
    googleMapsLink: String(data.googleMapsLink ?? ''),
  }

  return {
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    items: legacyItem.placeName || legacyItem.address ? [legacyItem] : [],
  }
}
