import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { AdminPanelRole } from "../types"
import { normalizeAdminRole, roleLabel } from "../utils"

const roleClassName: Record<AdminPanelRole, string> = {
  SUPER_ADMIN:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 dark:bg-violet-500/20",
  SDR:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20",
  CLOSER:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20",
  REVOPS:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20",
  CSM:
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-500/20",
  CS:
    "bg-slate-500/10 text-slate-700 dark:text-slate-300 dark:bg-slate-500/20",
}

export function AdminRoleBadge({
  role,
  className,
}: {
  role: string
  className?: string
}) {
  const normalizedRole = normalizeAdminRole(role)

  return (
    <Badge className={cn(roleClassName[normalizedRole], className)}>
      {roleLabel(role)}
    </Badge>
  )
}
