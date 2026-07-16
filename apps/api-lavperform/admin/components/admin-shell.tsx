"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { NavigationProgressProvider } from "@/components/navigation-progress-provider"
import { RouteContent } from "@/components/route-content"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProgressProvider>
      <TooltipProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <RouteContent>{children}</RouteContent>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </NavigationProgressProvider>
  )
}
