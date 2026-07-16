import { ADMIN_ROLE_LABELS } from "@/services/auth-types"

import type { AdminPanelRole } from "./types"

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function normalizeAdminRole(role: string): AdminPanelRole {
  if (role === "ADMIN") return "SDR"
  return role as AdminPanelRole
}

export function roleLabel(role: string): string {
  return ADMIN_ROLE_LABELS[role] ?? role
}
