import { formatTelefone } from '@/utils/mask'

export function formatSaleContact(
  phone?: string | null,
  email?: string | null,
): { phoneLabel: string | null; emailLabel: string | null } {
  const trimmedEmail = email?.trim() || null
  return {
    phoneLabel: phone ? formatTelefone(phone) : null,
    emailLabel: trimmedEmail,
  }
}
