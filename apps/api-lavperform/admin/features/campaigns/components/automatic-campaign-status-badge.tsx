import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { AUTOMATIC_CAMPAIGN_STATUS_LABELS } from "../utils"
import type { AutomaticCampaignStatus } from "../types"

const statusClassName: Record<AutomaticCampaignStatus, string> = {
  PROCESSING:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20",
  IN_PROGRESS:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 dark:bg-violet-500/20",
  COMPLETED:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-700 dark:text-red-300 dark:bg-red-500/20",
}

export function AutomaticCampaignStatusBadge({
  status,
  className,
}: {
  status: AutomaticCampaignStatus
  className?: string
}) {
  return (
    <Badge className={cn(statusClassName[status], className)}>
      {AUTOMATIC_CAMPAIGN_STATUS_LABELS[status]}
    </Badge>
  )
}
