"use client"

import { useState } from "react"
import { EyeIcon, MoreHorizontalIcon, Trash2Icon, BanknoteIcon, Undo2Icon } from "lucide-react"

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
  useDeletePayment,
  useReceivePaymentInCash,
  useRefundPayment,
  useSubscriptionPayments,
} from "../../billing-queries"
import type { AsaasPayment } from "../../types"
import {
  billingTypeLabel,
  extractPaymentsList,
  formatBRL,
  isPaymentPaid,
  isPaymentPending,
} from "../../utils"
import { PaymentStatusBadge } from "../shared/billing-status-badge"
import { ReceiveInCashDialog } from "../shared/receive-in-cash-dialog"
import { ConfirmActionDialog } from "../shared/confirm-action-dialog"
import { PaymentDetailSheet } from "./payment-detail-sheet"
import { CreatePaymentDialog } from "./create-payment-dialog"
import type { ReceiveInCashInput } from "../../schemas"

export function SubscriptionPaymentsTable({
  companyId,
}: {
  companyId: string
}) {
  const paymentsQuery = useSubscriptionPayments(companyId)
  const receiveMutation = useReceivePaymentInCash(companyId)
  const deleteMutation = useDeletePayment(companyId)
  const refundMutation = useRefundPayment(companyId)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [receiveTarget, setReceiveTarget] = useState<AsaasPayment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [refundId, setRefundId] = useState<string | null>(null)

  const payments = extractPaymentsList(paymentsQuery.data)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Nova cobrança avulsa
        </Button>
      </div>

      {paymentsQuery.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma cobrança encontrada para esta assinatura.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.dueDate ?? "—"}</TableCell>
                  <TableCell>
                    {payment.value != null
                      ? formatBRL(Number(payment.value))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell>{billingTypeLabel(payment.billingType)}</TableCell>
                  <TableCell>
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
                          onClick={() => setDetailId(payment.id)}
                        >
                          <EyeIcon className="size-4" />
                          Detalhes
                        </DropdownMenuItem>
                        {isPaymentPending(payment.status) && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setReceiveTarget(payment)}
                            >
                              <BanknoteIcon className="size-4" />
                              Baixa em dinheiro
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteId(payment.id)}
                            >
                              <Trash2Icon className="size-4" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                        {isPaymentPaid(payment.status) && (
                          <DropdownMenuItem
                            onClick={() => setRefundId(payment.id)}
                          >
                            <Undo2Icon className="size-4" />
                            Estornar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CreatePaymentDialog
        companyId={companyId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <PaymentDetailSheet
        companyId={companyId}
        paymentId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(o) => !o && setDetailId(null)}
      />
      <ReceiveInCashDialog
        open={Boolean(receiveTarget)}
        onOpenChange={(o) => !o && setReceiveTarget(null)}
        defaultValue={
          receiveTarget?.value != null
            ? Number(receiveTarget.value)
            : undefined
        }
        isPending={receiveMutation.isPending}
        onSubmit={(data: ReceiveInCashInput) => {
          if (!receiveTarget) return
          receiveMutation.mutate(
            { paymentId: receiveTarget.id, input: data },
            { onSuccess: () => setReceiveTarget(null) }
          )
        }}
      />
      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir cobrança"
        description="Remove a cobrança pendente no Asaas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId) return
          deleteMutation.mutate(deleteId, {
            onSuccess: () => setDeleteId(null),
          })
        }}
      />
      <ConfirmActionDialog
        open={Boolean(refundId)}
        onOpenChange={(o) => !o && setRefundId(null)}
        title="Estornar cobrança"
        description="Solicita estorno da cobrança paga conforme regras do Asaas."
        confirmLabel="Estornar"
        destructive
        isPending={refundMutation.isPending}
        onConfirm={() => {
          if (!refundId) return
          refundMutation.mutate(
            { paymentId: refundId, input: {} },
            { onSuccess: () => setRefundId(null) }
          )
        }}
      />
    </div>
  )
}
