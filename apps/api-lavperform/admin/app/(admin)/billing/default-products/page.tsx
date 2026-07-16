"use client"

import { DefaultProductsTable } from "@/features/billing/components/default-products/default-products-table"

export default function DefaultProductsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Catálogo de créditos
        </h1>
        <p className="text-sm text-muted-foreground">
          Ofertas default aplicadas a todas as empresas quando não houver
          produto personalizado com o mesmo código.
        </p>
      </div>
      <DefaultProductsTable />
    </div>
  )
}
