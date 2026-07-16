import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdministratorCreateForm } from "@/features/administrators/components/administrator-create-form"
import { SuperAdminOnly } from "@/features/administrators/components/super-admin-only"

export default function NewAdministratorPage() {
  return (
    <SuperAdminOnly>
      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/administrators" />}
          >
            <ArrowLeftIcon />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Novo administrador
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie um acesso com perfil Administrador. Este usuário não poderá
              conceder créditos via voucher nem cadastrar outros administradores.
            </p>
          </div>
        </div>

        <AdministratorCreateForm />
      </div>
    </SuperAdminOnly>
  )
}
