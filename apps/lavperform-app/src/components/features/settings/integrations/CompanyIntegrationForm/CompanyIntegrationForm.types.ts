export interface Props {
  name: string
  logo?: string
  partnerId: string
  webhook?: string
  codigoLoja?: string
  token?: string
  apiSecret?: string
  apiPassword?: string
  requiredFields?: string[]
  urlCardapio?: string
  onSuccess: () => void
}
