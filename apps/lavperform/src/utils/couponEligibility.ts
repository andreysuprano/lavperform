import type { CompanyCoupon } from '@/types'

/** Cupom ainda “usável” na data: não vencido (e opcionalmente não deletado). */
export function isCompanyCouponValidNow(
  coupon: CompanyCoupon,
  now: Date = new Date()
): boolean {
  if (coupon.deletedAt) return false
  if (!coupon.validUntil) return true
  return new Date(coupon.validUntil).getTime() >= now.getTime()
}

/**
 * Pode ser escolhido em campanha: ativo e ainda vigente.
 * (Substitui lógica antiga de `availableForCampaign`.)
 */
export function isCompanyCouponSelectableForCampaign(
  coupon: CompanyCoupon,
  now: Date = new Date()
): boolean {
  return coupon.active && isCompanyCouponValidNow(coupon, now)
}

/**
 * Página de listagem: mostrar cupon em vigor (ativo ou inativo), nunca deletado ou vencido.
 * Cupons inativos aparecem com badge "Inativo" no card.
 */
export function isCompanyCouponUsableInListing(
  coupon: CompanyCoupon,
  now: Date = new Date()
): boolean {
  return isCompanyCouponValidNow(coupon, now)
}
