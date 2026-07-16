import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { CHANNEL_LABELS } from "../utils"
import type { CampaignChannel } from "../types"

export function ChannelBadge({
  channel,
  className,
}: {
  channel: CampaignChannel
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn("font-normal", className)}>
      {CHANNEL_LABELS[channel]}
    </Badge>
  )
}
