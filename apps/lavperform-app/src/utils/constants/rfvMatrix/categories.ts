import type { RfvMatrixData } from '@/types'

export type RfvSegmentCategory =
  | 'positivos'
  | 'neutros'
  | 'atencao'
  | 'criticos'
  | 'leads'

export interface RfvSegmentCategoryInfo {
  id: RfvSegmentCategory
  label: string
  segments: Array<keyof RfvMatrixData>
}

export const RFV_SEGMENT_CATEGORIES: RfvSegmentCategoryInfo[] = [
  {
    id: 'positivos',
    label: 'Segmentos Positivos',
    segments: ['campeao', 'fiel', 'em_potencial'],
  },
  {
    id: 'neutros',
    label: 'Segmentos Neutros',
    segments: ['novo', 'promissor'],
  },
  {
    id: 'atencao',
    label: 'Necessitam Atenção',
    segments: ['precisa_de_atencao', 'quase_dormente'],
  },
  {
    id: 'criticos',
    label: 'Segmentos Críticos',
    segments: ['nao_posso_perder', 'em_risco', 'hibernando', 'perdido'],
  },
  {
    id: 'leads',
    label: 'Leads',
    segments: ['lead'],
  },
]
