export interface Props {
  name: string
  logo?: string
  partnerId: string
  webhook?: string
  codigoLoja?: string
  token?: string
  urlCardapio?: string
  onSuccess: () => void
}
