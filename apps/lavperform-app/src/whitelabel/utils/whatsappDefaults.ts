import type { CtaData } from '../types'

/** Número usado no template quando a empresa ainda não tem telefone. */
export const WHATSAPP_PLACEHOLDER_NUMBER = '5548999999999'

export const DEFAULT_WHATSAPP_MESSAGE =
  'Olá! Vim pelo site e gostaria de mais informações.'

/**
 * Converte o telefone do cadastro (ou o valor salvo na LP) para o formato do wa.me.
 * Inclui o DDI 55 e o 9 de celular quando o número brasileiro vem sem eles.
 */
export function toWhatsappDigits(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''

  const alreadyHasCountryCode =
    digits.startsWith('55') &&
    (digits.length === 12 || digits.length === 13 || digits.length > 13)

  if (alreadyHasCountryCode) return digits

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const number = digits.slice(2)
    if (!number.startsWith('9')) return `55${ddd}9${number}`
    return `55${digits}`
  }

  if (digits.length === 10 || digits.length === 9) {
    const ddd = digits.slice(0, 2)
    const number = digits.slice(2)
    return `55${ddd}9${number}`
  }

  return digits
}

export function buildWhatsappUrl(
  phone?: string | null,
  message?: string | null
): string | null {
  const digits = toWhatsappDigits(phone)
  if (!digits) return null

  const text = message?.trim() || DEFAULT_WHATSAPP_MESSAGE
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/**
 * Número da LP, com o telefone do cadastro quando o salvo está vazio
 * ou ainda é o placeholder do template. Mensagem vazia volta para o texto padrão.
 */
export function withWhatsappDefaults(
  cta: CtaData,
  companyPhone?: string | null
): CtaData {
  const stored = toWhatsappDigits(cta.whatsappNumber)
  const fromCompany = toWhatsappDigits(companyPhone)
  const missingOrPlaceholder = !stored || stored === WHATSAPP_PLACEHOLDER_NUMBER

  return {
    ...cta,
    whatsappNumber:
      missingOrPlaceholder && fromCompany ? fromCompany : stored || fromCompany,
    whatsappMessage: cta.whatsappMessage?.trim()
      ? cta.whatsappMessage
      : DEFAULT_WHATSAPP_MESSAGE,
  }
}
