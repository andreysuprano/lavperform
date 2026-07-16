"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { useCreditLedger } from "../../billing-queries"
import type { CreditLedgerEntry } from "../../types"
import { formatCents } from "../../utils"

function isPlatformVoucherEntry(entry: CreditLedgerEntry): boolean {
  return (
    entry.topup?.paymentMethod === "PLATFORM" ||
    entry.metadata?.source === "platform-voucher"
  )
}

function ledgerTypeLabel(entry: CreditLedgerEntry): string {
  if (entry.type === "CONSUMPTION") return "Consumo"
  if (isPlatformVoucherEntry(entry)) return "Voucher"
  return "Recarga"
}

function ledgerDescription(entry: CreditLedgerEntry): string {
  const reason = entry.metadata?.reason
  if (typeof reason === "string" && reason.trim()) return reason
  if (entry.description?.trim()) return entry.description
  return "—"
}

export function CreditLedgerTable({ companyId }: { companyId: string }) {
  const query = useCreditLedger(companyId, { limit: 50 })
  const items = query.data?.items ?? []

  if (query.isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted" />
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma movimentação no extrato.</p>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Saldo após</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => {
            const isTopup = entry.type === "TOPUP"
            const isVoucher = isPlatformVoucherEntry(entry)

            return (
              <TableRow key={entry.id}>
                <TableCell>
                  {new Date(entry.createdAt).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      isTopup ? (isVoucher ? "outline" : "default") : "secondary"
                    }
                  >
                    {ledgerTypeLabel(entry)}
                  </Badge>
                </TableCell>
                <TableCell
                  className={isTopup ? "text-green-600" : "text-red-600"}
                >
                  {isTopup ? "+" : "-"}
                  {formatCents(Math.abs(entry.amountCents))}
                </TableCell>
                <TableCell>{formatCents(entry.balanceAfterCents)}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {ledgerDescription(entry)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
