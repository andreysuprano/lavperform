"use client"

import { BrandLogo } from "@/components/brand-logo"
import { SidebarHeader } from "@/components/ui/sidebar"

export function SidebarBrand() {
  return (
    <SidebarHeader>
      <div className="flex w-full items-center justify-start group-data-[collapsible=icon]:justify-center">
        <BrandLogo
          variant="full"
          className="group-data-[collapsible=icon]:hidden"
          imageClassName="h-8 w-auto max-w-[180px] object-contain"
        />
        <BrandLogo
          variant="icon"
          className="hidden group-data-[collapsible=icon]:flex"
          imageClassName="size-8 object-contain"
        />
      </div>
    </SidebarHeader>
  )
}
