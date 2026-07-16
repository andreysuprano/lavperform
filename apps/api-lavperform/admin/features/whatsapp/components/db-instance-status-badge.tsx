import { Badge } from "@/components/ui/badge"

import type { WhatsappInstanceDbStatus } from "../types"
import { DB_INSTANCE_STATUS_LABELS } from "../utils"

const VARIANTS: Record<
  WhatsappInstanceDbStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONNECTED: "default",
  DISCONNECTED: "secondary",
  PENDING: "outline",
  ERROR: "destructive",
}

export function DbInstanceStatusBadge({
  status,
}: {
  status: WhatsappInstanceDbStatus
}) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"}>
      {DB_INSTANCE_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
