export const DEFAULT_WHATSAPP_MESSAGE =
  "Olá! Vim pelo site e gostaria de mais informações."

/** Mesma regra de apps/lavperform-app/src/whitelabel/utils/whatsappDefaults.ts */
export function toWhatsappDigits(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "")
  if (!digits) return ""

  const alreadyHasCountryCode =
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13 || digits.length > 13)

  if (alreadyHasCountryCode) return digits

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const number = digits.slice(2)
    if (!number.startsWith("9")) return `55${ddd}9${number}`
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
  message?: string | null,
): string | null {
  const digits = toWhatsappDigits(phone)
  if (!digits) return null

  const text = message?.trim() || DEFAULT_WHATSAPP_MESSAGE
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}
