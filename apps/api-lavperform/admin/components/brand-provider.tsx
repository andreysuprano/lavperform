"use client"

import * as React from "react"

import {
  getBrandConfig,
  type BrandAsset,
  type BrandConfig,
} from "@/lib/brand"

const BrandContext = React.createContext<BrandConfig | null>(null)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const config = React.useMemo(() => getBrandConfig(), [])

  return (
    <BrandContext.Provider value={config}>{children}</BrandContext.Provider>
  )
}

export function useBrand(): BrandConfig {
  const context = React.useContext(BrandContext)

  if (!context) {
    return getBrandConfig()
  }

  return context
}

export function useBrandAsset(asset: BrandAsset): string {
  const { getAssetUrl } = useBrand()
  return getAssetUrl(asset)
}
