import type {
  InstanceListFilters,
  UazapiInstanceStatus,
  WhatsappInstanceDbStatus,
  WhatsappInstanceListItem,
} from "./types"

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

export function formatPhone(value: string | null | undefined): string {
  if (!value) return "—"
  const digits = value.replace(/\D/g, "")
  if (digits.length === 13) {
    return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, "+$1 ($2) $3-$4")
  }
  if (digits.length === 12) {
    return digits.replace(/^(\d{2})(\d{2})(\d{4})(\d{4})$/, "+$1 ($2) $3-$4")
  }
  return value
}

export const UAZAPI_STATUS_LABELS: Record<UazapiInstanceStatus, string> = {
  connected: "Conectado",
  connecting: "Conectando",
  disconnected: "Desconectado",
  pending: "Aguardando QR",
}

export const DB_INSTANCE_STATUS_LABELS: Record<WhatsappInstanceDbStatus, string> =
  {
    CONNECTED: "Conectado",
    DISCONNECTED: "Desconectado",
    PENDING: "Pendente",
    ERROR: "Erro",
  }

export function slugifyInstanceName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function filterInstances(
  instances: WhatsappInstanceListItem[],
  filters: InstanceListFilters
): WhatsappInstanceListItem[] {
  const search = filters.search?.trim().toLowerCase()

  return instances.filter((instance) => {
    if (filters.status && instance.status !== filters.status) {
      return false
    }

    if (filters.linked === "linked" && !instance.company) {
      return false
    }

    if (filters.linked === "orphan" && instance.company) {
      return false
    }

    if (!search) return true

    const haystack = [
      instance.name,
      instance.adminField01,
      instance.company?.name,
      instance.company?.email,
      instance.token,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(search)
  })
}

export function truncateToken(token: string, visible = 8): string {
  if (token.length <= visible * 2) return token
  return `${token.slice(0, visible)}…${token.slice(-visible)}`
}

/** Origem pública do admin onde a rota /connect/:token está hospedada. */
export function getWhatsappConnectBaseUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_WHATSAPP_CONNECT_BASE_URL?.trim()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return configured.replace(/\/$/, "")
    }
  }

  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return undefined
}

/** Corrige links gerados com localhost quando o admin roda em outro domínio. */
export function resolveConnectionLinkUrl(url: string): string {
  const base = getWhatsappConnectBaseUrl()
  if (!base) return url

  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\/connect\/([^/]+)$/)
    if (!match) return url
    return `${base.replace(/\/$/, "")}/connect/${match[1]}`
  } catch {
    return url
  }
}
