"use client"

import { useQuery } from "@tanstack/react-query"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { getSubscriptionPayment } from "../../company-billing-api"
import { companyBillingKeys } from "../../billing-queries"
import { formatBRL, billingTypeLabel } from "../../utils"
import { PaymentStatusBadge } from "../shared/billing-status-badge"

export function PaymentDetailSheet({
  companyId,
  paymentId,
  open,
  onOpenChange,
}: {
  companyId: string
  paymentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = useQuery({
    queryKey: paymentId
      ? [...companyBillingKeys.payments(companyId), paymentId]
      : ["__none__"],
    queryFn: () =>
      getSubscriptionPayment(companyId, paymentId as string),
    enabled: Boolean(paymentId) && open,
  })

  const payment = query.data?.payment

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Detalhe da cobrança</SheetTitle>
          <SheetDescription>
            {paymentId ? `ID: ${paymentId}` : ""}
          </SheetDescription>
        </SheetHeader>
        {query.isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {payment && (
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-medium">
                {payment.value != null ? formatBRL(Number(payment.value)) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento</span>
              <span>{payment.dueDate ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forma</span>
              <span>{billingTypeLabel(payment.billingType)}</span>
            </div>
            {payment.invoiceUrl && (
              <a
                href={payment.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Abrir fatura
              </a>
            )}
            {query.data?.pixQrCode != null && (
              <div className="rounded border p-3">
                <p className="mb-2 font-medium">Pix</p>
                <pre className="max-h-40 overflow-auto text-xs">
                  {JSON.stringify(query.data.pixQrCode, null, 2)}
                </pre>
              </div>
            )}
            {query.data?.barcode != null && (
              <div className="rounded border p-3">
                <p className="mb-2 font-medium">Boleto</p>
                <pre className="max-h-40 overflow-auto text-xs">
                  {JSON.stringify(query.data.barcode, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
