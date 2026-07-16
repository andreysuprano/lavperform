"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProfileAvatarSection } from "@/features/profile/components/profile-avatar-section"
import { useAdminProfile } from "@/features/profile/profile-queries"
import { ADMIN_ROLE_LABELS } from "@/services/auth-types"

export default function ProfilePage() {
  const profileQuery = useAdminProfile()

  if (profileQuery.isLoading) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="h-64 max-w-2xl animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!profileQuery.data) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar seu perfil.
        </p>
      </div>
    )
  }

  const profile = profileQuery.data

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:gap-8 md:px-6 md:py-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie sua foto e visualize os dados da sua conta.
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-4 md:gap-6">
        <ProfileAvatarSection
          name={profile.name}
          avatarUrl={profile.avatarUrl}
        />

        <Card>
          <CardHeader>
            <CardTitle>Dados da conta</CardTitle>
            <CardDescription>
              Informações básicas do seu acesso ao painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Nome</p>
              <p className="text-muted-foreground">{profile.name}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">E-mail</p>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Perfil</p>
              <p className="text-muted-foreground">
                {ADMIN_ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
