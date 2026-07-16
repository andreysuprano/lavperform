import type { LocationBackendPayload, LocationData, LocationItem } from '../types'

/**
 * Normaliza dados de localização recebidos do backend para o formato interno
 * com `items[]`, garantindo compatibilidade com o formato legado (campos planos)
 * e o novo formato (array de itens).
 */
export function normalizeLocationData(raw: unknown): LocationData {
  if (!raw || typeof raw !== 'object') {
    return { title: '', description: '', items: [] }
  }

  const data = raw as Record<string, unknown>

  if (Array.isArray(data.items)) {
    return {
      title: (data.title as string) ?? '',
      description: (data.description as string) ?? '',
      items: data.items as LocationItem[],
    }
  }

  const legacyItem: LocationItem = {
    placeName: (data.placeName as string) ?? '',
    address: (data.address as string) ?? '',
    mapUrl: (data.mapUrl as string) ?? '',
    mapEmbedUrl: (data.mapEmbedUrl as string) ?? '',
    googleMapsLink: (data.googleMapsLink as string) ?? '',
  }

  return {
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    items: legacyItem.placeName || legacyItem.address ? [legacyItem] : [],
  }
}

/**
 * Serializa dados de localização para o formato aceito pelo backend.
 *
 * O backend exige os campos planos (`placeName`, `address`, etc.) por validação.
 * Enviamos também o array `items` para que backends que preservam campos extras
 * no JSONB possam restaurar múltiplas unidades no próximo carregamento.
 */
export function serializeLocationForBackend(
  data: LocationData
): LocationBackendPayload {
  const first = data.items[0] ?? ({} as LocationItem)

  return {
    ...data,
    placeName: first.placeName ?? '',
    address: first.address ?? '',
    mapUrl: first.mapUrl ?? '',
    mapEmbedUrl: first.mapEmbedUrl ?? '',
    googleMapsLink: first.googleMapsLink ?? '',
  }
}
