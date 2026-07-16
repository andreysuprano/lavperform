"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { OverviewMetricsGrid } from "@/features/overview/components/overview-metrics-grid"
import { useAdminSession } from "@/hooks/use-admin-session"
import { ADMIN_ROLE_LABELS } from "@/services/auth-types"

export default function HomePage() {
  const user = useAdminSession()

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:gap-8 md:px-6 md:py-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {user ? (
              <UserAvatar
                name={user.adminUserName}
                avatarUrl={user.adminUserAvatarUrl}
                className="size-12"
              />
            ) : null}
            <div>
              <CardTitle>Bem-vindo, {user?.adminUserName}</CardTitle>
              <CardDescription>
                Painel administrativo — visão geral da plataforma
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">E-mail:</span>{" "}
            {user?.adminUserEmail}
          </p>
          <p>
            <span className="font-medium text-foreground">Perfil:</span>{" "}
            {user?.role ? (ADMIN_ROLE_LABELS[user.role] ?? user.role) : "—"}
          </p>
        </CardContent>
      </Card>

      <OverviewMetricsGrid />
    </div>
  )
}
