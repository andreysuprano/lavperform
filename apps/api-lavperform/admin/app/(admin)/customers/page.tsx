"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ExportCustomersButton } from "@/features/customers/export-customers-button"

export default function CustomersExportPage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Baixe todos os clientes de todas as lavanderias. O arquivo traz
            nome, telefone, e-mail, aniversário, cidade e a lavanderia de cada
            um.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportCustomersButton />
        </CardContent>
      </Card>
    </div>
  )
}
