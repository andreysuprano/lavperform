import type { PromptSheetSnapshot } from '@/whitelabel/types'
import { CADASTRO_KEYS } from './sheet-script'

const HOURS_KEY_DAY: Record<string, { short: string; name: string }> = {
  hours_seg: { short: 'seg', name: 'segunda' },
  hours_ter: { short: 'ter', name: 'terca' },
  hours_qua: { short: 'qua', name: 'quarta' },
  hours_qui: { short: 'qui', name: 'quinta' },
  hours_sex: { short: 'sex', name: 'sexta' },
  hours_sab: { short: 'sab', name: 'sabado' },
  hours_dom: { short: 'dom', name: 'domingo' },
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ''
}

function formatAddress(
  address: PromptSheetSnapshot['address']
): string | null {
  const parts: string[] = []
  const streetParts = [address.street, address.number].filter(
    (part) => !isBlank(part)
  )
  if (streetParts.length > 0) {
    parts.push(streetParts.map((part) => part!.trim()).join(', '))
  }
  if (!isBlank(address.complement)) {
    parts.push(address.complement!.trim())
  }
  if (!isBlank(address.neighborhood)) {
    parts.push(address.neighborhood!.trim())
  }
  const city = !isBlank(address.city) ? address.city!.trim() : ''
  const state = !isBlank(address.state) ? address.state!.trim() : ''
  const cityState = [city, state].filter(Boolean).join(' - ')
  if (cityState) {
    parts.push(cityState)
  }
  if (!isBlank(address.zipCode)) {
    parts.push(address.zipCode!.trim())
  }
  return parts.length === 0 ? null : parts.join(', ')
}

function findOpeningHour(
  openingHours: PromptSheetSnapshot['openingHours'],
  short: string,
  name: string
) {
  return openingHours.find((row) => {
    const normalized = stripAccents(row.dayOfWeek.toLowerCase().trim())
    return normalized.startsWith(short) || normalized.startsWith(name)
  })
}

/** Valor do cadastro a confirmar, se houver; caso contrário null (perguntar). */
export function snapshotShownValue(
  key: string,
  snapshot: PromptSheetSnapshot
): string | null {
  if (!(CADASTRO_KEYS as readonly string[]).includes(key)) {
    return null
  }

  if (key === 'name') {
    return isBlank(snapshot.name) ? null : snapshot.name!.trim()
  }
  if (key === 'phone') {
    return isBlank(snapshot.phone) ? null : snapshot.phone!.trim()
  }
  if (key === 'address') {
    return formatAddress(snapshot.address)
  }

  const day = HOURS_KEY_DAY[key]
  if (!day) return null
  const row = findOpeningHour(snapshot.openingHours, day.short, day.name)
  if (!row) return null
  if (!row.isOpen) return 'Fechado'
  return `${row.openTime} às ${row.closeTime}`
}
