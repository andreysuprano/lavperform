"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useCreditBalance } from "../../billing-queries"
import { formatCents } from "../../utils"

export function CreditsBalanceCard({ companyId }: { companyId: string }) {
  const query = useCreditBalance(companyId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldo de créditos</CardTitle>
        <CardDescription>Saldo disponível para consumo na plataforma</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-3xl font-semibold tabular-nums">
            {formatCents(query.data?.balanceCents ?? 0)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
