"use client"

import { PlansTable } from "@/features/billing/components/plans/plans-table"

export default function PlansPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Planos de assinatura
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os planos disponíveis para empresas. Planos ativos aparecem
          na aba de faturamento ao vincular ou trocar assinaturas.
        </p>
      </div>
      <PlansTable />
    </div>
  )
}
