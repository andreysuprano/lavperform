import type { RfvMatrixData } from '@/types'

export const RFV_SEGMENT_COLORS: Record<keyof RfvMatrixData, string> = {
  campeao: 'yellow.500',
  fiel: 'yellow.400',
  em_potencial: 'yellow.300',
  novo: 'gray.200',
  promissor: 'yellow.200',
  precisa_de_atencao: 'orange.300',
  quase_dormente: 'gray.400',
  nao_posso_perder: 'orange.700',
  em_risco: 'red.600',
  hibernando: 'gray.600',
  perdido: 'gray.700',
}

const CHAKRA_COLOR_TO_HEX: Record<string, string> = {
  'yellow.500': '#eab308',
  'yellow.400': '#facc15',
  'yellow.300': '#fde047',
  'yellow.200': '#fef08a',
  'gray.200': 'black',
  'gray.400': '#9ca3af',
  'gray.600': '#4b5563',
  'gray.700': '#374151',
  'orange.300': '#fdba74',
  'orange.500': '#f97316',
  'orange.700': '#c2410c',
  'red.400': '#f87171',
  'red.600': '#dc2626',
}

export function getColorHex(colorToken: string): string {
  return CHAKRA_COLOR_TO_HEX[colorToken] || '#8884d8'
}
