import type { Plan } from '@/types'

export const cycleLabels: Record<Plan['cycle'], string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY: 'Anual',
}

export const cycleDescriptions: Record<Plan['cycle'], string> = {
  MONTHLY: 'Cobrança mensal',
  QUARTERLY: 'Cobrança a cada 3 meses',
  SEMIANNUALLY: 'Cobrança a cada 6 meses',
  YEARLY: 'Cobrança anual',
}
