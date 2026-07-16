import type { IntegrationFieldName, IntegrationPartner } from "./types"

const FIELD_LABELS: Record<IntegrationFieldName, string> = {
  apiKey: "API Key",
  apiSecret: "API Secret",
  username: "Usuário",
  password: "Senha",
  merchantId: "ID da loja (Merchant)",
  digitalMenuUrl: "URL do cardápio digital",
}

const SLUG_LABELS: Record<string, string> = {
  VMLAV: "VM Lav",
  CICCLO: "Cicclo",
  L2AUTOMATE: "L2 Automate",
  MAXLAV: "Maxlav",
  CONSUMER: "Consumer",
}

export function integrationFieldLabel(field: IntegrationFieldName): string {
  return FIELD_LABELS[field]
}

const SUPPORTS_IMPORT_HISTORY_SLUGS = new Set([
  "VMLAV",
  "CICCLO",
  "L2AUTOMATE",
  "MAXLAV",
])

export function partnerSupportsImportHistory(
  slug: string | null | undefined
): boolean {
  if (!slug) return false
  return SUPPORTS_IMPORT_HISTORY_SLUGS.has(slug)
}

export function partnerSlugLabel(slug: string | null | undefined): string {
  if (!slug) return "—"
  return SLUG_LABELS[slug] ?? slug
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export function getVisibleFields(partner: IntegrationPartner | null | undefined) {
  if (!partner) return [] as IntegrationFieldName[]
  const fields = new Set<IntegrationFieldName>([
    ...(partner.requiredFields as IntegrationFieldName[]),
    ...(partner.optionalFields as IntegrationFieldName[]),
  ])
  return Array.from(fields)
}

export function defaultImportDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  return {
    startDate: formatLocalDateOnly(start),
    endDate: formatLocalDateOnly(end),
  }
}

function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
