import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CompanyCreateForm } from "@/features/companies/components/company-create-form"

export default function NewCompanyPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/companies" />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Nova empresa
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre uma nova empresa na plataforma. O status inicial será
            pendente.
          </p>
        </div>
      </div>

      <CompanyCreateForm />
    </div>
  )
}
