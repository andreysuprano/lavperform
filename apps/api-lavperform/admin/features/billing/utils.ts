import type { CycleType, CreditTopupStatus } from "./types"

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatCents(cents: number): string {
  return formatBRL(cents / 100)
}

export function cycleLabel(cycle: CycleType | string | undefined): string {
  const labels: Record<string, string> = {
    MONTHLY: "Mensal",
    YEARLY: "Anual",
    SEMIANNUALLY: "Semestral",
    QUARTERLY: "Trimestral",
  }
  return cycle ? (labels[cycle] ?? cycle) : "—"
}

export function billingTypeLabel(type: string | undefined): string {
  const labels: Record<string, string> = {
    BOLETO: "Boleto",
    PIX: "Pix",
    CREDIT_CARD: "Cartão de crédito",
    DEBIT_CARD: "Cartão de débito",
    UNDEFINED: "A definir",
  }
  return type ? (labels[type] ?? type) : "—"
}

export function paymentMethodLabel(method: string | undefined): string {
  if (method === "PLATFORM") return "Voucher plataforma"
  return billingTypeLabel(method)
}

export type StatusVariant = "default" | "secondary" | "destructive" | "outline"

export function paymentStatusVariant(
  status: string | undefined
): StatusVariant {
  if (!status) return "secondary"
  const s = status.toUpperCase()
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "PAID"].includes(s))
    return "default"
  if (["PENDING", "AWAITING_RISK_ANALYSIS"].includes(s)) return "secondary"
  if (["OVERDUE", "REFUNDED", "REFUND_REQUESTED"].includes(s))
    return "destructive"
  return "outline"
}

export function topupStatusVariant(
  status: CreditTopupStatus | string
): StatusVariant {
  const map: Record<string, StatusVariant> = {
    PAID: "default",
    PENDING: "secondary",
    FAILED: "destructive",
    CANCELED: "outline",
    EXPIRED: "destructive",
  }
  return map[status] ?? "outline"
}

export function topupStatusLabel(status: CreditTopupStatus | string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    FAILED: "Falhou",
    CANCELED: "Cancelado",
    EXPIRED: "Expirado",
  }
  return labels[status] ?? status
}

export function paymentStatusLabel(status: string | undefined): string {
  if (!status) return "—"
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    OVERDUE: "Vencido",
    RECEIVED: "Recebido",
    CONFIRMED: "Confirmado",
    RECEIVED_IN_CASH: "Recebido em dinheiro",
    REFUNDED: "Estornado",
  }
  return labels[status.toUpperCase()] ?? status
}

export function isPaymentPaid(status: string | undefined): boolean {
  if (!status) return false
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(
    status.toUpperCase()
  )
}

export function isPaymentPending(status: string | undefined): boolean {
  if (!status) return false
  return ["PENDING", "OVERDUE"].includes(status.toUpperCase())
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function extractPaymentsList(
  response: unknown
): import("./types").AsaasPayment[] {
  if (!response || typeof response !== "object") return []
  const r = response as { data?: unknown[] }
  if (Array.isArray(r.data)) return r.data as import("./types").AsaasPayment[]
  if (Array.isArray(response)) return response as import("./types").AsaasPayment[]
  return []
}
