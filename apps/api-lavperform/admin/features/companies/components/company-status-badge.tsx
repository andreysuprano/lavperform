import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { COMPANY_STATUS_LABELS } from "../utils"
import type { CompanyStatus } from "../types"

const statusClassName: Record<CompanyStatus, string> = {
  ACTIVE:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20",
  INACTIVE:
    "bg-muted text-muted-foreground",
  PENDING:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20",
}

export function CompanyStatusBadge({
  status,
  className,
}: {
  status: CompanyStatus
  className?: string
}) {
  return (
    <Badge className={cn(statusClassName[status], className)}>
      {COMPANY_STATUS_LABELS[status]}
    </Badge>
  )
}
