"use client"

import { useState } from "react"
import {
  BanknoteIcon,
  MoreHorizontalIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  useCreditTopups,
  useDeleteTopupCharge,
  useReceiveTopupInCash,
  useSyncTopup,
} from "../../billing-queries"
import type { CreditTopup } from "../../types"
import { formatCents, paymentMethodLabel } from "../../utils"
import { TopupStatusBadge } from "../shared/billing-status-badge"
import { ReceiveInCashDialog } from "../shared/receive-in-cash-dialog"
import { ConfirmActionDialog } from "../shared/confirm-action-dialog"
import { CreateTopupDialog } from "./create-topup-dialog"
import { RecoverTopupDialog } from "./recover-topup-dialog"
import type { ReceiveInCashInput } from "../../schemas"

function isPlatformVoucher(topup: CreditTopup): boolean {
  return topup.paymentMethod === "PLATFORM"
}

function topupTypeLabel(topup: CreditTopup): string {
  return isPlatformVoucher(topup)
    ? "Voucher plataforma"
    : paymentMethodLabel(topup.paymentMethod)
}

export function CreditTopupsTable({ companyId }: { companyId: string }) {
  const topupsQuery = useCreditTopups(companyId, { limit: 50 })
  const syncMutation = useSyncTopup(companyId)
  const receiveMutation = useReceiveTopupInCash(companyId)
  const deleteChargeMutation = useDeleteTopupCharge(companyId)

  const [createOpen, setCreateOpen] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [receiveTarget, setReceiveTarget] = useState<CreditTopup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditTopup | null>(null)

  const items = topupsQuery.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setRecoverOpen(true)}>
          Recuperar órfã
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Adicionar créditos
        </Button>
      </div>

      {topupsQuery.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma recarga encontrada.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((topup) => (
                <TableRow key={topup.id}>
                  <TableCell>
                    {new Date(topup.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{formatCents(topup.amountCents)}</TableCell>
                  <TableCell>
                    {isPlatformVoucher(topup) && topup.status === "PAID" ? (
                      <Badge variant="default">Concedido</Badge>
                    ) : (
                      <TopupStatusBadge status={topup.status} />
                    )}
                  </TableCell>
                  <TableCell>{topupTypeLabel(topup)}</TableCell>
                  <TableCell>
                    {!isPlatformVoucher(topup) && topup.asaasChargeId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => syncMutation.mutate(topup.id)}
                          >
                            <RefreshCwIcon className="size-4" />
                            Sincronizar Asaas
                          </DropdownMenuItem>
                          {topup.status === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setReceiveTarget(topup)}
                              >
                                <BanknoteIcon className="size-4" />
                                Baixa em dinheiro
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(topup)}
                              >
                                <Trash2Icon className="size-4" />
                                Cancelar cobrança
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreateTopupDialog
        companyId={companyId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <RecoverTopupDialog
        companyId={companyId}
        open={recoverOpen}
        onOpenChange={setRecoverOpen}
      />
      <ReceiveInCashDialog
        open={Boolean(receiveTarget)}
        onOpenChange={(o) => !o && setReceiveTarget(null)}
        title="Baixa em dinheiro — recarga"
        defaultValue={
          receiveTarget ? receiveTarget.amountCents / 100 : undefined
        }
        isPending={receiveMutation.isPending}
        onSubmit={(data: ReceiveInCashInput) => {
          if (!receiveTarget) return
          receiveMutation.mutate(
            { topupId: receiveTarget.id, input: data },
            { onSuccess: () => setReceiveTarget(null) }
          )
        }}
      />
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Cancelar cobrança da recarga"
        description="Exclui a cobrança no Asaas e marca a recarga como cancelada."
        confirmLabel="Cancelar cobrança"
        destructive
        isPending={deleteChargeMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteChargeMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </div>
  )
}
