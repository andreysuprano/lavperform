import { formatCurrency } from '@/utils/money'

export type CampaignDerivedMetrics = {
  /** Retorno como múltiplo (receita / custo). Null quando não há custo. */
  roi: number | null
  /** Rótulo pronto do ROI (ex.: "5x" ou "-"). */
  roiLabel: string
  /** Custo por venda/compra. Null quando não há vendas. */
  costPerSale: number | null
  /** Rótulo pronto do custo por venda (moeda ou "-"). */
  costPerSaleLabel: string
}

/**
 * Deriva ROI (múltiplo receita/custo) e custo por venda a partir das métricas
 * da campanha, tratando divisão por zero.
 */
export function getCampaignDerivedMetrics(
  totalCost: number | null | undefined,
  salesTotalAmount: number | null | undefined,
  salesTotalQuantity: number | null | undefined,
): CampaignDerivedMetrics {
  const cost = Number(totalCost) || 0
  const revenue = Number(salesTotalAmount) || 0
  const sales = Number(salesTotalQuantity) || 0

  const roi = cost > 0 ? revenue / cost : null
  const costPerSale = sales > 0 ? cost / sales : null

  return {
    roi,
    roiLabel: formatRoi(roi),
    costPerSale,
    costPerSaleLabel: costPerSale === null ? '-' : formatCurrency(costPerSale),
  }
}

/** Formata o ROI como múltiplo (ex.: "5x", "3,2x"). */
export function formatRoi(roi: number | null): string {
  if (roi === null || !Number.isFinite(roi)) return '-'
  const rounded = Math.round(roi * 10) / 10
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `${formatted}x`
}

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP_WEB: 'WhatsApp Web',
  WHATSAPP_BUSINESS_API: 'WhatsApp Business API',
  SMS: 'SMS',
  RCS: 'RCS',
  EMAIL: 'Email',
  PUSH_NOTIFICATION: 'Push Notification',
}

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

/** Rótulo do canal a partir do valor do enum (aceita maiúsculas ou minúsculas). */
export function formatChannelLabel(channel: string): string {
  const key = (channel ?? '').toUpperCase()
  return CHANNEL_LABELS[key] ?? channel
}

/** Rótulo da categoria de template (Meta). */
export function formatTemplateCategoryLabel(category: string | null): string {
  if (!category) return ''
  return TEMPLATE_CATEGORY_LABELS[category.toUpperCase()] ?? category
}

/** Rótulo completo do tipo de mensagem (canal + categoria quando houver). */
export function formatMessageTypeLabel(
  channel: string,
  category: string | null,
): string {
  const channelLabel = formatChannelLabel(channel)
  const categoryLabel = formatTemplateCategoryLabel(category)
  return categoryLabel ? `${channelLabel} · ${categoryLabel}` : channelLabel
}

export type CampaignFunnelRates = {
  ctr: number
  clickToSaleRate: number
  conversionRate: number
}

/** Taxas do funil envio → clique → venda (valores em percentual 0–100). */
export function getCampaignFunnelRates(
  messagesSent: number,
  interactions: number,
  salesTotalQuantity: number,
): CampaignFunnelRates {
  const sent = Number(messagesSent) || 0
  const clicks = Number(interactions) || 0
  const sales = Number(salesTotalQuantity) || 0

  return {
    ctr: sent > 0 ? (clicks / sent) * 100 : 0,
    clickToSaleRate: clicks > 0 ? (sales / clicks) * 100 : 0,
    conversionRate: sent > 0 ? (sales / sent) * 100 : 0,
  }
}

/** Formata percentual (0–100) para exibição (ex.: "12,5%"). */
export function formatPercentRate(
  rate: number | null | undefined,
  fractionDigits = 1,
): string {
  const value = Number(rate)
  if (!Number.isFinite(value)) return '-'
  return `${value.toLocaleString('pt-BR', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  })}%`
}

export type CampaignStrategyInsight = {
  id: string
  message: string
}

export type CampaignInsightsInput = {
  messagesSent: number
  interactions: number
  salesTotalQuantity: number
  salesTotalAmount: number
  ctr: number
  clickToSaleRate: number
  conversionRate: number
  errorRate: number
  roi: number | null
  topCampaignName?: string
  topCampaignMessagesSent?: number
}

const CTR_HIGH = 8
const CTR_LOW = 2
const CLICK_TO_SALE_LOW = 10
const ERROR_RATE_HIGH = 5
const VOLUME_LOW = 50

/**
 * Gera até 3 insights acionáveis com base nas métricas do período.
 */
export function getCampaignStrategyInsights(
  input: CampaignInsightsInput,
): CampaignStrategyInsight[] {
  const insights: CampaignStrategyInsight[] = []
  const {
    messagesSent,
    salesTotalAmount,
    ctr,
    clickToSaleRate,
    conversionRate,
    errorRate,
    roi,
    topCampaignName,
    topCampaignMessagesSent,
  } = input

  if (messagesSent <= 0) return insights

  if (salesTotalAmount <= 0) {
    insights.push({
      id: 'no-revenue',
      message:
        'Houve envios no período, mas nenhuma receita atribuída. Revise a oferta, a janela de atribuição RFV ou se o link da mensagem está correto.',
    })
  }

  if (errorRate > ERROR_RATE_HIGH) {
    insights.push({
      id: 'high-error',
      message: `Taxa de erro em ${formatPercentRate(errorRate)} — acima do ideal. Verifique canal, templates e status das integrações.`,
    })
  }

  if (ctr >= CTR_HIGH && clickToSaleRate < CLICK_TO_SALE_LOW && salesTotalAmount > 0) {
    insights.push({
      id: 'funnel-drop',
      message:
        'CTR alto com poucas vendas após o clique: a mensagem atrai, mas a oferta ou a página de destino pode não estar convertendo.',
    })
  }

  if (ctr > 0 && ctr < CTR_LOW && conversionRate >= 1) {
    insights.push({
      id: 'low-ctr',
      message:
        'Poucos cliques em relação aos envios. Reforce o CTA e o link na mensagem para aumentar o engajamento.',
    })
  }

  if (
    roi != null &&
    roi >= 3 &&
    topCampaignName &&
    (topCampaignMessagesSent ?? 0) < VOLUME_LOW
  ) {
    insights.push({
      id: 'scale-winner',
      message: `"${topCampaignName}" tem bom ROI com volume ainda baixo. Considere aumentar o limite diário de envios dessa campanha.`,
    })
  }

  return insights.slice(0, 3)
}
