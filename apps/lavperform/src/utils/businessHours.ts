import { OpeningHours } from '@/types/organization-page.types'

import { WEEKDAYS } from './weekdays'

/**
 * Verifica se o restaurante está aberto no momento atual
 * @param openingHours Array com os horários de funcionamento
 * @returns { isOpen: boolean, message: string }
 */
export function checkIfOpen(openingHours: OpeningHours[] | undefined): {
  isOpen: boolean
  message: string
} {
  if (!openingHours || openingHours.length === 0) {
    return { isOpen: true, message: 'Aberto' }
  }

  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0 = domingo, 1 = segunda, ...

  // Converte o dia da semana do JS (0-6, começando no domingo)
  // para o formato usado no sistema (seg, ter, qua, etc.)
  // 0 (domingo) -> 7, 1 (segunda) -> 1, etc.
  const dayIndex = currentDayOfWeek === 0 ? 7 : currentDayOfWeek
  const currentDayShort =
    WEEKDAYS.find((day) => day.value === dayIndex)?.short || ''

  // Busca o horário de funcionamento para o dia atual
  const todaySchedule = openingHours.find(
    (schedule) => schedule.dayOfWeek.toLowerCase() === currentDayShort
  )

  // Se não há horário definido para hoje, considera fechado
  if (!todaySchedule) {
    return { isOpen: false, message: 'Fechado' }
  }

  // Se está marcado como fechado
  if (!todaySchedule.isOpen) {
    return { isOpen: false, message: 'Fechado' }
  }

  // Verifica se está dentro do horário de funcionamento
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`

  const isWithinHours =
    currentTime >= todaySchedule.openTime &&
    currentTime <= todaySchedule.closeTime

  return {
    isOpen: isWithinHours,
    message: isWithinHours ? 'Aberto' : 'Fechado',
  }
}

/**
 * Ordena os horários de funcionamento pela ordem dos dias da semana
 * @param openingHours Array com os horários de funcionamento
 * @returns Array ordenado começando pela segunda-feira
 */
export function sortOpeningHours(
  openingHours: OpeningHours[] | undefined
): OpeningHours[] {
  if (!openingHours || openingHours.length === 0) {
    return []
  }

  return [...openingHours].sort((a, b) => {
    const dayA =
      WEEKDAYS.find((day) => day.short === a.dayOfWeek.toLowerCase())?.value ||
      999
    const dayB =
      WEEKDAYS.find((day) => day.short === b.dayOfWeek.toLowerCase())?.value ||
      999
    return dayA - dayB
  })
}
