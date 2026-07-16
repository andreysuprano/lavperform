"use client"

import { BrandImage } from "@/components/brand-image"
import { cn } from "@/lib/utils"
import type { BrandAsset } from "@/lib/brand"

type BrandBackgroundProps = React.ComponentProps<"div"> & {
  asset?: BrandAsset
  overlayClassName?: string
}

export function BrandBackground({
  asset = "bg_default",
  className,
  overlayClassName,
  children,
  ...props
}: BrandBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <BrandImage
        asset={asset}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      {overlayClassName ? (
        <div
          aria-hidden
          className={cn("absolute inset-0", overlayClassName)}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  )
}
