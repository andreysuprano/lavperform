import { Badge } from "@/components/ui/badge"

import type { UazapiInstanceStatus } from "../types"
import { UAZAPI_STATUS_LABELS } from "../utils"

const VARIANTS: Record<
  UazapiInstanceStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  connected: "default",
  connecting: "outline",
  disconnected: "secondary",
  pending: "outline",
}

export function UazapiStatusBadge({ status }: { status: UazapiInstanceStatus }) {
  return (
    <Badge variant={VARIANTS[status] ?? "secondary"}>
      {UAZAPI_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
