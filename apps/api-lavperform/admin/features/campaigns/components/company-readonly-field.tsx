import Link from "next/link"

import { useCompany } from "@/features/companies/companies-queries"

export function CompanyReadonlyField({
  companyId,
  companyName,
}: {
  companyId: string
  companyName?: string
}) {
  const companyQuery = useCompany(companyName ? undefined : companyId)
  const name = companyName ?? companyQuery.data?.name ?? "—"

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">Empresa</span>
      <Link
        href={`/companies/${companyId}`}
        className="text-sm font-medium text-foreground hover:underline"
      >
        {companyQuery.isLoading && !companyName ? "Carregando..." : name}
      </Link>
      <span className="text-xs text-muted-foreground">
        A empresa dona da campanha não pode ser alterada.
      </span>
    </div>
  )
}
