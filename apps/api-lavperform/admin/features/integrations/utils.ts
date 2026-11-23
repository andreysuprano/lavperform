import type { IntegrationFieldName, IntegrationPartner } from "./types"

const FIELD_LABELS: Record<IntegrationFieldName, string> = {
  apiKey: "API Key",
  apiSecret: "API Secret",
  username: "Usuário",
  password: "Senha",
  merchantId: "ID da loja (Merchant)",
  digitalMenuUrl: "URL do PDV",
}

const FIELD_HINTS: Partial<
  Record<string, Partial<Record<IntegrationFieldName, { label: string; hint: string }>>>
> = {
  MAXLAV: {
    apiKey: {
      label: "Token de acesso",
      hint: "Cole um token Bearer ainda válido do dashboard. Ele vale até o vencimento.",
    },
    merchantId: {
      label: "ID da loja",
      hint: "Opcional. Informe quando o token atende mais de uma loja.",
    },
    digitalMenuUrl: {
      label: "URL da API",
      hint: "Opcional. Em branco, usamos https://api-dashboard.maxpan.com.br.",
    },
  },
  LAUNDRYKIT: {
    apiKey: {
      label: "Token de acesso",
      hint: "Cole o JWT ainda válido do dashboard. Ele dura cerca de 10 horas e precisa ser colado de novo depois disso.",
    },
    merchantId: {
      label: "ID da loja",
      hint: "STORE_ID usado nas consultas do Laundry Kit.",
    },
    digitalMenuUrl: {
      label: "URL da rota",
      hint: "Opcional. Em branco, usamos a rota padrão do dashboard.",
    },
  },
  SISLAV: {
    apiKey: {
      label: "Token da sessão",
      hint: "Cole o cookie authjs.session-token, ou só o valor, ainda válido. A sessão é renovada sozinha.",
    },
    merchantId: {
      label: "ID da lavanderia",
      hint: "laundryId usado na consulta de vendas.",
    },
    apiSecret: {
      label: "ID da organização",
      hint: "Valor do header x-organization-id.",
    },
    digitalMenuUrl: {
      label: "URL do app",
      hint: "Opcional. Em branco, usamos https://app.sislav.com.br.",
    },
  },
}

const SLUG_LABELS: Record<string, string> = {
  VMLAV: "VM Lav",
  CICCLO: "Cicclo",
  WINDEL: "Windel",
  WAYMONEY: "WayMoney",
  L2AUTOMATE: "L2 Automate",
  MAXLAV: "Maxlav",
  LAUNDRYKIT: "Laundry Kit",
  SISLAV: "SisLav",
  HYBEX: "Hybex",
  AGIDEZ: "Hybex",
  HYBEX_ESSENCE: "Hybex Essence",
  CONSUMER: "Consumer",
}

export function integrationFieldLabel(
  field: IntegrationFieldName,
  partnerSlug?: string | null,
): string {
  if (partnerSlug?.toUpperCase() === "VMLAV" && field === "merchantId") {
    return "CNPJ"
  }
  if (
    (partnerSlug?.toUpperCase() === "WINDEL" ||
      partnerSlug?.toUpperCase() === "WAYMONEY") &&
    field === "merchantId"
  ) {
    return "E-mail"
  }
  if (
    (partnerSlug?.toUpperCase() === "WINDEL" ||
      partnerSlug?.toUpperCase() === "WAYMONEY") &&
    field === "apiKey"
  ) {
    return "Senha"
  }
  if (partnerSlug?.toUpperCase() === "HYBEX_ESSENCE" && field === "merchantId") {
    return "Código da loja (GUID)"
  }
  if (partnerSlug?.toUpperCase() === "HYBEX_ESSENCE" && field === "apiKey") {
    return "Chave de integração"
  }
  if (partnerSlug?.toUpperCase() === "HYBEX_ESSENCE" && field === "password") {
    return "ApiPassword"
  }
  return FIELD_HINTS[partnerSlug?.toUpperCase() ?? ""]?.[field]?.label ?? FIELD_LABELS[field]
}

export function integrationFieldHint(
  field: IntegrationFieldName,
  partnerSlug?: string | null,
): string | null {
  return FIELD_HINTS[partnerSlug?.toUpperCase() ?? ""]?.[field]?.hint ?? null
}

export function sessionSetupHint(partnerSlug?: string | null): string | null {
  const slug = partnerSlug?.toUpperCase()
  if (slug === "SISLAV") {
    return "Cole o cookie authjs.session-token ainda válido. A sessão é renovada sozinha enquanto esse cookie responder."
  }
  if (slug === "LAUNDRYKIT") {
    return "Cole o JWT ainda válido do dashboard e o ID da loja. O token dura cerca de 10 horas e precisa ser colado de novo depois disso."
  }
  if (slug === "MAXLAV") {
    return "Cole o token Bearer ainda válido do dashboard. Ele vale até o vencimento."
  }
  return null
}

const SUPPORTS_IMPORT_HISTORY_SLUGS = new Set([
  "VMLAV",
  "CICCLO",
  "WINDEL",
  "WAYMONEY",
  "L2AUTOMATE",
  "MAXLAV",
  "LAUNDRYKIT",
  "HYBEX",
  "AGIDEZ",
  "HYBEX_ESSENCE",
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
