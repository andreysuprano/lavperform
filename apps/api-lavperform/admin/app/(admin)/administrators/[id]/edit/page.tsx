import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdministratorEditForm } from "@/features/administrators/components/administrator-edit-form"
import { SuperAdminOnly } from "@/features/administrators/components/super-admin-only"

export default async function EditAdministratorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
              Editar administrador
            </h2>
            <p className="text-sm text-muted-foreground">
              Atualize os dados de acesso deste administrador.
            </p>
          </div>
        </div>

        <AdministratorEditForm administratorId={id} />
      </div>
    </SuperAdminOnly>
  )
}
