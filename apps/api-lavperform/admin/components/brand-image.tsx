"use client"

import * as React from "react"

import { useBrand } from "@/components/brand-provider"
import { cn } from "@/lib/utils"
import type { BrandAsset } from "@/lib/brand"

type BrandImageProps = Omit<
  React.ComponentProps<"img">,
  "src" | "onError"
> & {
  asset: BrandAsset
}

export function BrandImage({
  asset,
  alt,
  className,
  ...props
}: BrandImageProps) {
  const { getAssetUrl, getAssetFallbackUrl } = useBrand()
  const [src, setSrc] = React.useState(() => getAssetUrl(asset))

  React.useEffect(() => {
    setSrc(getAssetUrl(asset))
  }, [asset, getAssetUrl])

  function handleError() {
    const fallbackUrl = getAssetFallbackUrl(asset)

    setSrc((current) => (current === fallbackUrl ? current : fallbackUrl))
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={cn(className)}
      {...props}
    />
  )
}
