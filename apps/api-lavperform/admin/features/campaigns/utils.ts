import type {
  AutomaticCampaignStatus,
  AutomaticCampaignType,
  CampaignChannel,
  CampaignMetric,
  CampaignStatus,
  MessageStatus,
  PaginationMeta,
} from "./types"

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  WAITING: "Aguardando",
  PROCESSING: "Processando",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
}

export const AUTOMATIC_CAMPAIGN_STATUS_LABELS: Record<
  AutomaticCampaignStatus,
  string
> = {
  PROCESSING: "Processando",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
}

export const AUTOMATIC_CAMPAIGN_TYPE_LABELS: Record<
  AutomaticCampaignType,
  string
> = {
  ACQUISITION: "Aquisição",
  RECURRENCE: "Recorrência",
  REACTIVATION: "Reativação",
  RECOGNITION: "Reconhecimento",
  SALES: "Venda",
}

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  WHATSAPP_WEB: "WhatsApp Web",
  WHATSAPP_BUSINESS_API: "WhatsApp Business API",
  SMS: "SMS",
  RCS: "RCS",
  EMAIL: "E-mail",
  PUSH_NOTIFICATION: "Push",
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  SENT: "Enviada",
  ERROR: "Erro",
  ABORTED: "Abortada",
}

export const DAYS_OF_WEEK_OPTIONS = [
  { value: "seg", label: "Seg" },
  { value: "ter", label: "Ter" },
  { value: "qua", label: "Qua" },
  { value: "qui", label: "Qui" },
  { value: "sex", label: "Sex" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
] as const

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatMetric(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(num)) return String(value)
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"
  const num = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(num)) return String(value)
  return `${formatMetric(num)}%`
}

export function parseImagesJson(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function stringifyImagesJson(urls: string[]): string | undefined {
  const filtered = urls.filter((url) => url.trim() !== "")
  if (filtered.length === 0) return undefined
  return JSON.stringify(filtered)
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    const date = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return ""
  }
}

export function fromDatetimeLocalValue(value: string): string {
  if (!value) return ""
  return new Date(value).toISOString()
}

export function enrichPaginationMeta(meta: PaginationMeta): PaginationMeta & {
  hasNextPage: boolean
  hasPreviousPage: boolean
} {
  return {
    ...meta,
    hasNextPage: meta.page < meta.totalPages,
    hasPreviousPage: meta.page > 1,
  }
}

export function getPrimaryMetric(
  metrics: { messagesSent: number; messagesError: number }[] | undefined
): { sent: number; errors: number } {
  const metric = metrics?.[0]
  return {
    sent: metric?.messagesSent ?? 0,
    errors: metric?.messagesError ?? 0,
  }
}

export interface AggregatedCampaignMetrics {
  messagesSent: number
  messagesDelivered: number
  messagesError: number
  interactions: number
  salesTotalQuantity: number
  salesTotalAmount: number
  conversionRate: number
  campaignCount: number
}

export function aggregateCampaignMetrics(
  campaigns: { campaignMetric?: CampaignMetric[] }[]
): AggregatedCampaignMetrics {
  const totals = campaigns.reduce(
    (acc, campaign) => {
      const metric = campaign.campaignMetric?.[0]
      if (!metric) return acc

      return {
        messagesSent: acc.messagesSent + metric.messagesSent,
        messagesDelivered: acc.messagesDelivered + metric.messagesDelivered,
        messagesError: acc.messagesError + metric.messagesError,
        interactions: acc.interactions + metric.interactions,
        salesTotalQuantity: acc.salesTotalQuantity + metric.salesTotalQuantity,
        salesTotalAmount:
          acc.salesTotalAmount + Number(metric.salesTotalAmount),
        campaignCount: acc.campaignCount + 1,
      }
    },
    {
      messagesSent: 0,
      messagesDelivered: 0,
      messagesError: 0,
      interactions: 0,
      salesTotalQuantity: 0,
      salesTotalAmount: 0,
      campaignCount: 0,
    }
  )

  const conversionRate =
    totals.messagesSent > 0
      ? (totals.salesTotalQuantity / totals.messagesSent) * 100
      : 0

  return { ...totals, conversionRate }
}

export function formatSalesOrigin(origin: string | null | undefined): string {
  if (!origin) return "—"
  return origin.replace(/_/g, " ")
}

export type SendScheduleMode = "establishment" | "fixed" | "range"

export function inferSendScheduleMode(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null
): SendScheduleMode {
  if (!sendTimeStart) return "establishment"
  if (sendTimeEnd) return "range"
  return "fixed"
}

export function formatSendScheduleLabel(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null
): string {
  const mode = inferSendScheduleMode(sendTimeStart, sendTimeEnd)

  if (mode === "establishment") {
    return "Horário de funcionamento do estabelecimento"
  }

  if (mode === "fixed" && sendTimeStart) {
    return `Horário fixo às ${sendTimeStart}`
  }

  if (mode === "range" && sendTimeStart && sendTimeEnd) {
    return `Intervalo das ${sendTimeStart} às ${sendTimeEnd}`
  }

  return "Horário de funcionamento do estabelecimento"
}

export function buildSendScheduleApiFields(
  mode: SendScheduleMode,
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null
): { sendTimeStart: string | null; sendTimeEnd: string | null } {
  if (mode === "establishment") {
    return { sendTimeStart: null, sendTimeEnd: null }
  }

  if (mode === "fixed") {
    return {
      sendTimeStart: sendTimeStart?.trim() || null,
      sendTimeEnd: null,
    }
  }

  return {
    sendTimeStart: sendTimeStart?.trim() || null,
    sendTimeEnd: sendTimeEnd?.trim() || null,
  }
}
