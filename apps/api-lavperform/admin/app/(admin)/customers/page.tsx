"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ExportCompaniesButton } from "@/features/companies/export-companies-button"

export default function CustomersExportPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card>
        <CardHeader>
          <CardTitle>Lavanderias</CardTitle>
          <CardDescription>
            Baixe todas as lavanderias cadastradas, inclusive inativas e
            excluídas. O arquivo traz os dados da lavanderia e uma coluna de
            status: ativo, inativo, pendente ou deletado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportCompaniesButton />
        </CardContent>
      </Card>
    </div>
  )
}
