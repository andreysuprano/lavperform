import { Badge } from "@/components/ui/badge"

import type { AdminOverviewStats } from "../types"
import { formatRelativeUpdatedAt } from "../utils"

export function OverviewStaleBadge({
  stats,
}: {
  stats: AdminOverviewStats | undefined
}) {
  if (!stats?.computedAt) return null

  return (
    <Badge variant="outline" className="font-normal">
      Atualizado {formatRelativeUpdatedAt(stats.computedAt)}
      {stats.fromCache ? " (cache)" : ""}
    </Badge>
  )
}
