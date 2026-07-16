import { ADMIN_ROLE_LABELS } from "@/services/auth-types"

import type { AdminPanelRole } from "./types"

export const ADMIN_PANEL_ROLES = [
  "SDR",
  "CLOSER",
  "REVOPS",
  "CSM",
  "CS",
  "SUPER_ADMIN",
] as const satisfies readonly AdminPanelRole[]

export const ADMIN_ROLE_OPTIONS = ADMIN_PANEL_ROLES.map((role) => ({
  value: role,
  label: ADMIN_ROLE_LABELS[role] ?? role,
}))
