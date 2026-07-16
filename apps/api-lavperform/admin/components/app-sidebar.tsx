"use client"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { SidebarBrand } from "@/components/sidebar-brand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useAdminSession } from "@/hooks/use-admin-session"
import { getNavMainItems, navSecondaryItems } from "@/lib/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const session = useAdminSession()
  const navMainItems = getNavMainItems(session?.role)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrand />
      <SidebarContent>
        <NavMain items={navMainItems} />
        {navSecondaryItems.length > 0 ? (
          <NavSecondary items={navSecondaryItems} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
