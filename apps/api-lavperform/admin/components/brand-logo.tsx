"use client"

import { BrandImage } from "@/components/brand-image"
import { useBrand } from "@/components/brand-provider"
import { cn } from "@/lib/utils"

type BrandLogoProps = {
  variant?: "full" | "icon"
  className?: string
  imageClassName?: string
  showName?: boolean
}

export function BrandLogo({
  variant = "full",
  className,
  imageClassName,
  showName = false,
}: BrandLogoProps) {
  const { appName } = useBrand()

  const imageClass = cn(
    variant === "icon"
      ? "size-8 object-contain"
      : "h-8 w-auto max-w-[180px] object-contain",
    imageClassName
  )

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "icon" ? (
        <BrandImage asset="logo_icon" alt={appName} className={imageClass} />
      ) : (
        <>
          <BrandImage
            asset="logo"
            alt={appName}
            className={cn(imageClass, "dark:hidden")}
          />
          <BrandImage
            asset="logo_dark"
            alt={appName}
            className={cn(imageClass, "hidden dark:block")}
          />
        </>
      )}
      {showName && variant === "full" ? (
        <span className="text-base font-semibold">{appName}</span>
      ) : null}
    </div>
  )
}
