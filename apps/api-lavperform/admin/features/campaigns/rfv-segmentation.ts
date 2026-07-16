export const RFV_SEGMENTATION_LABELS: Record<string, string> = {
  campeao: "Campeões",
  fiel: "Clientes Fiéis",
  em_potencial: "Fiéis em Potencial",
  novo: "Novos Clientes",
  promissor: "Clientes Promissores",
  precisa_de_atencao: "Precisam de Atenção",
  quase_dormente: "Quase Dormentes",
  nao_posso_perder: "Não Posso Perder",
  em_risco: "Em Risco",
  hibernando: "Hibernando",
  perdido: "Perdidos",
}

export const RFV_SEGMENTATION_ICONS: Record<string, string> = {
  campeao: "🏆",
  fiel: "🤝",
  em_potencial: "🚀",
  novo: "🆕",
  promissor: "🌟",
  precisa_de_atencao: "👀",
  quase_dormente: "😴",
  nao_posso_perder: "❤️",
  em_risco: "⚠️",
  hibernando: "🐻",
  perdido: "💔",
}

export function parseSegmentation(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  return value.replaceAll(" ", "").split(",").filter(Boolean)
}

export function getSegmentationLabel(segment: string): string {
  return (
    RFV_SEGMENTATION_LABELS[segment] ??
    segment.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

export function getSegmentationIcon(segment: string): string | undefined {
  return RFV_SEGMENTATION_ICONS[segment]
}

export function isKnownRfvSegment(segment: string): boolean {
  return segment in RFV_SEGMENTATION_LABELS
}
