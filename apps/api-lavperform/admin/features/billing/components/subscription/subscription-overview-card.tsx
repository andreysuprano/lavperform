"use client"

import { useState } from "react"
import { RefreshCwIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useProvisionSubscription, useDeleteSubscription } from "../../billing-queries"
import type { SubscriptionOverview } from "../../types"
import {
  billingTypeLabel,
  cycleLabel,
  formatBRL,
} from "../../utils"
import { AsaasIdCopy } from "../shared/asaas-id-copy"
import { ConfirmActionDialog } from "../shared/confirm-action-dialog"
import { PaymentStatusBadge } from "../shared/billing-status-badge"
import { ChangePlanDialog } from "./change-plan-dialog"
import { SubscriptionStatusDialog } from "./subscription-status-dialog"

export function SubscriptionOverviewCard({
  companyId,
  data,
}: {
  companyId: string
  data: SubscriptionOverview
}) {
  const [changePlanOpen, setChangePlanOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const provisionMutation = useProvisionSubscription(companyId)
  const deleteMutation = useDeleteSubscription(companyId)

  const plan = data.plan
  const asaas = data.asaas
  const isFreePlan = plan && Number(plan.price) <= 0
  const needsProvision =
    !isFreePlan && plan && !data.internal.subscriptionId

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Assinatura do plano</CardTitle>
            <CardDescription>
              {plan?.name ?? "Plano não vinculado"} —{" "}
              {plan ? formatBRL(plan.price) : "—"} /{" "}
              {cycleLabel(plan?.cycle)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChangePlanOpen(true)}
            >
              Trocar plano
            </Button>
            {!isFreePlan && data.internal.subscriptionId && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatusOpen(true)}
                >
                  Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isFreePlan && (
            <p className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Plano gratuito — sem assinatura no Asaas.
            </p>
          )}
          {needsProvision && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                Empresa com plano pago mas sem assinatura no Asaas. Provisione
                para gerar cobranças.
              </p>
              <Button
                size="sm"
                disabled={provisionMutation.isPending}
                onClick={() => provisionMutation.mutate(undefined)}
              >
                <RefreshCwIcon className="size-4" />
                Provisionar no Asaas
              </Button>
            </div>
          )}
          {asaas && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">Status Asaas</span>
                <div className="mt-1">
                  <PaymentStatusBadge status={asaas.status} />
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Valor</span>
                <p className="font-medium">
                  {asaas.value != null ? formatBRL(Number(asaas.value)) : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Forma</span>
                <p>{billingTypeLabel(asaas.billingType)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Próx. vencimento</span>
                <p>{asaas.nextDueDate ?? "—"}</p>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <AsaasIdCopy
              label="ID assinatura (Asaas)"
              value={data.internal.subscriptionId}
            />
          </div>
        </CardContent>
      </Card>

      <ChangePlanDialog
        companyId={companyId}
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        currentPlanId={data.internal.planId ?? data.plan?.id}
        currentPlan={data.plan}
      />
      <SubscriptionStatusDialog
        companyId={companyId}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />
      <ConfirmActionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remover assinatura no Asaas"
        description="Remove a assinatura e cobranças pendentes/vencidas no Asaas. O vínculo local do plano é mantido."
        confirmLabel="Remover"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => setDeleteOpen(false),
          })
        }
      />
    </>
  )
}
