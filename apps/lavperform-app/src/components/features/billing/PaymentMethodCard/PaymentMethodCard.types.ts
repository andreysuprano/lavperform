export interface Props {
  hasCard: boolean
  subscriptionCard: string | undefined
  isLoading: boolean
  onAddCard: () => void
  allowBoleto?: boolean
  allowPix?: boolean
  planAllowsAlternativePayments?: boolean
  alternativePaymentLabel?: string
}
