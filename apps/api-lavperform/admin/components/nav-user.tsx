"use client"

import { useAppRouter } from "@/hooks/use-app-router"

import { UserAvatar } from "@/components/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAdminSession } from "@/hooks/use-admin-session"
import { EllipsisVerticalIcon, LogOutIcon, UserIcon } from "lucide-react"
import { clearStoredToken } from "@/services/auth-storage"

export function NavUser() {
  const router = useAppRouter()
  const { isMobile } = useSidebar()
  const user = useAdminSession()

  function handleLogout() {
    clearStoredToken()
    router.replace("/login")
    router.refresh()
  }

  if (!user) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={user.adminUserName}
                className="aria-expanded:bg-muted"
              />
            }
          >
            <UserAvatar
              name={user.adminUserName}
              avatarUrl={user.adminUserAvatarUrl}
              className="size-8 shrink-0"
            />
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium">{user.adminUserName}</span>
              <span className="truncate text-xs text-foreground/70">
                {user.adminUserEmail}
              </span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserAvatar
                    name={user.adminUserName}
                    avatarUrl={user.adminUserAvatarUrl}
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.adminUserName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.adminUserEmail}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserIcon />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
