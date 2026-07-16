import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { MESSAGE_STATUS_LABELS } from "../utils"
import type { MessageStatus } from "../types"

const statusClassName: Record<MessageStatus, string> = {
  PENDING:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20",
  PROCESSING:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20",
  SENT: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20",
  ERROR: "bg-red-500/10 text-red-700 dark:text-red-300 dark:bg-red-500/20",
  ABORTED: "bg-muted text-muted-foreground",
}

export function MessageStatusBadge({
  status,
  className,
}: {
  status: MessageStatus
  className?: string
}) {
  return (
    <Badge className={cn(statusClassName[status], className)}>
      {MESSAGE_STATUS_LABELS[status]}
    </Badge>
  )
}
