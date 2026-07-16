import { Badge } from "@/components/ui/badge"

import type { ApiKeyStatus } from "./types"

export function formatApiKeyDate(value: string | null | undefined): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

export function apiKeyStatusLabel(status: ApiKeyStatus): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa"
    case "REVOKED":
      return "Revogada"
    case "EXPIRED":
      return "Expirada"
    default:
      return status
  }
}

export function ApiKeyStatusBadge({ status }: { status: ApiKeyStatus }) {
  const variant =
    status === "ACTIVE"
      ? "default"
      : status === "REVOKED"
        ? "destructive"
        : "secondary"

  return <Badge variant={variant}>{apiKeyStatusLabel(status)}</Badge>
}
