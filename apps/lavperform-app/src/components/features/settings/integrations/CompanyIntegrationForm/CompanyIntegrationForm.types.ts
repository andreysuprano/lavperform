import type { IntegrationSessionView } from './partner-fields'

export interface Props {
  name: string
  logo?: string
  partnerId: string
  partnerSlug?: string
  webhook?: string
  codigoLoja?: string
  token?: string
  apiSecret?: string
  apiPassword?: string
  requiredFields?: string[]
  optionalFields?: string[]
  urlCardapio?: string
  session?: IntegrationSessionView | null
  onSuccess: () => void
}
