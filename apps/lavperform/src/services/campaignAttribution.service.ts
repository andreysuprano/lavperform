import type {
  ConversionWindowResponse,
  ListSegmentAttributionsResponse,
  RfvClassificationSnake,
  SegmentAttribution,
  UpdateConversionWindowRequest,
  UpdateSegmentAttributionPayload,
} from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'

import { client } from './client'

const DEFAULT_CONVERSION_DAYS = 7

const segmentIdToBackendKey: Record<
  RfvClassificationSnake,
  keyof ConversionWindowResponse
> = {
  campeao: 'campeao',
  fiel: 'fiel',
  em_potencial: 'emPotencial',
  novo: 'novo',
  promissor: 'promissor',
  precisa_de_atencao: 'precisaDeAtencao',
  quase_dormente: 'quaseDormente',
  nao_posso_perder: 'naoPossoPerder',
  em_risco: 'emRisco',
  hibernando: 'hibernando',
  perdido: 'perdido',
}

function getBackendKeyForSegment(
  segmentId: string
): keyof ConversionWindowResponse | undefined {
  if (segmentId in segmentIdToBackendKey) {
    return segmentIdToBackendKey[segmentId as RfvClassificationSnake]
  }
  return undefined
}

export const campaignAttributionService = {
  async listSegmentAttributions(companyId: string) {
    const response = await client.get<ConversionWindowResponse>(
      `/conversion-window/company/${companyId}`
    )

    const data: SegmentAttribution[] = clientTypesOptions.items.map((item) => {
      const backendKey = getBackendKeyForSegment(item.value)

      return {
        id: item.value as RfvClassificationSnake,
        name: `Cliente ${item.label}`,
        conversionDays: backendKey
          ? (response.data[backendKey] ?? DEFAULT_CONVERSION_DAYS)
          : DEFAULT_CONVERSION_DAYS,
      }
    })

    const mapped: ListSegmentAttributionsResponse = { data }
    return { ...response, data: mapped }
  },

  async updateSegmentAttribution(
    companyId: string,
    payload: UpdateSegmentAttributionPayload
  ) {
    const body: UpdateConversionWindowRequest = {
      items: [
        {
          rfvClassification: payload.segmentId,
          thresholdDays: payload.conversionDays,
        },
      ],
    }

    return await client.put(`/conversion-window/company/${companyId}`, body)
  },
}

