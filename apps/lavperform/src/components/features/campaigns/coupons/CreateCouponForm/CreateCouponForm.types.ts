import type { CompanyCoupon } from '@/types'

export type Props = {
  onClose?: () => void
  /** Quando fornecido, o formulário opera em modo edição (PUT). */
  coupon?: CompanyCoupon
  /** Controle externo de abertura (usado no modo edição). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}
