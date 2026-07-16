import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  getSegmentationIcon,
  getSegmentationLabel,
  isKnownRfvSegment,
  parseSegmentation,
} from "../rfv-segmentation"

export function SegmentationBadges({
  segmentation,
  className,
}: {
  segmentation: string | null | undefined
  className?: string
}) {
  const segments = parseSegmentation(segmentation)

  if (segments.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {segments.map((segment) => (
        <SegmentationBadge key={segment} segment={segment} />
      ))}
    </div>
  )
}

function SegmentationBadge({ segment }: { segment: string }) {
  const icon = getSegmentationIcon(segment)
  const label = getSegmentationLabel(segment)
  const isKnown = isKnownRfvSegment(segment)

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isKnown
          ? "border-border bg-muted/40 text-foreground"
          : "border-dashed text-muted-foreground"
      )}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
    </Badge>
  )
}
