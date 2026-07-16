/**
 * Utilitário centralizado para dias da semana
 * Padronização: A semana sempre inicia na SEGUNDA-FEIRA
 */

export interface WeekDay {
  value: number
  label: string
  short: string
  fullName: string
}

/**
 * Lista dos dias da semana começando na segunda-feira
 * value: 1 = segunda, 2 = terça, ..., 7 = domingo
 * label: Versão curta para exibição (SEG, TER, etc)
 * short: Versão abreviada minúscula para horários/schedules (seg, ter, etc)
 * fullName: Nome completo do dia (Segunda, Terça, etc)
 */
export const WEEKDAYS: WeekDay[] = [
  { value: 1, label: 'SEG', short: 'seg', fullName: 'Segunda' },
  { value: 2, label: 'TER', short: 'ter', fullName: 'Terça' },
  { value: 3, label: 'QUA', short: 'qua', fullName: 'Quarta' },
  { value: 4, label: 'QUI', short: 'qui', fullName: 'Quinta' },
  { value: 5, label: 'SEX', short: 'sex', fullName: 'Sexta' },
  { value: 6, label: 'SAB', short: 'sab', fullName: 'Sábado' },
  { value: 7, label: 'DOM', short: 'dom', fullName: 'Domingo' },
]

/**
 * Lista dos dias da semana em formato abreviado (para horários/schedules)
 * Derivado de WEEKDAYS para garantir consistência
 */
export const WEEKDAYS_SHORT = WEEKDAYS.map((day) => day.short)

/**
 * Mapeamento de abreviação para nome completo
 * Derivado de WEEKDAYS para garantir consistência
 */
export const WEEKDAY_NAMES: Record<string, string> = Object.fromEntries(
  WEEKDAYS.map((day) => [day.short, day.fullName])
)

/**
 * Retorna o nome completo de um dia da semana baseado na abreviação
 */
export function getWeekdayFullName(shortName: string): string {
  return (
    WEEKDAY_NAMES[shortName.toLowerCase()] ||
    shortName.charAt(0).toUpperCase() + shortName.slice(1)
  )
}
