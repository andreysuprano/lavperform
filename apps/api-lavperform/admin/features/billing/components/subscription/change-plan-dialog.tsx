"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { SelectValueLookup } from "@/components/select-value-label"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { useChangePlan, usePlans } from "../../billing-queries"
import { changePlanSchema, type ChangePlanInput } from "../../schemas"
import type { Plan } from "../../types"
import { formatBRL } from "../../utils"

export function ChangePlanDialog({
  companyId,
  open,
  onOpenChange,
  currentPlanId,
  currentPlan,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlanId?: string
  currentPlan?: Plan | null
}) {
  const plansQuery = usePlans()
  const mutation = useChangePlan(companyId)

  const form = useForm<ChangePlanInput>({
    resolver: zodResolver(changePlanSchema),
    defaultValues: {
      planId: "",
      updatePendingPayments: true,
    },
  })

  const planOptions = useMemo(() => {
    const plans = plansQuery.data ?? []
    if (currentPlan && !plans.some((plan) => plan.id === currentPlan.id)) {
      return [...plans, currentPlan]
    }
    return plans
  }, [plansQuery.data, currentPlan])

  const planById = useMemo(
    () => new Map(planOptions.map((plan) => [plan.id, plan])),
    [planOptions]
  )

  useEffect(() => {
    if (!open) return

    form.reset({
      planId: currentPlanId ?? currentPlan?.id ?? "",
      value: undefined,
      updatePendingPayments: true,
    })
  }, [open, currentPlanId, currentPlan?.id, form])

  const selectedPlanId = form.watch("planId")
  const selectedPlan = planById.get(selectedPlanId ?? "")

  const submitForm = form.handleSubmit(
    (data) => {
      mutation.mutate(data, {
        onSuccess: () => onOpenChange(false),
      })
    },
    (errors) => {
      const firstError = Object.values(errors)[0]
      toast.error(firstError?.message ?? "Verifique os campos do formulário")
    }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar plano</DialogTitle>
          <DialogDescription>
            Atualiza o plano no sistema e na assinatura Asaas. Cobranças
            pendentes podem ser atualizadas com a opção abaixo.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
          <Field data-invalid={!!form.formState.errors.planId}>
            <FieldLabel>Plano</FieldLabel>
            <Controller
              control={form.control}
              name="planId"
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => {
                      if (typeof value !== "string") return
                      field.onChange(value)
                      const plan = planById.get(value)
                      if (!plan || Number(plan.price) <= 0) {
                        form.setValue("value", undefined, { shouldValidate: true })
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      {plansQuery.isLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Carregando planos...
                        </span>
                      ) : (
                        <SelectValueLookup
                          placeholder="Selecione o plano"
                          lookup={(id) => {
                            const plan = planById.get(id)
                            return plan
                              ? `${plan.name} — ${formatBRL(plan.price)}`
                              : undefined
                          }}
                        />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} — {formatBRL(plan.price)}
                          {!plan.active ? " (inativo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </>
              )}
            />
            {!plansQuery.isLoading && planOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum plano ativo cadastrado.{" "}
                <Link href="/billing/plans" className="underline underline-offset-4">
                  Gerenciar planos
                </Link>
              </p>
            )}
          </Field>
          {selectedPlan && Number(selectedPlan.price) > 0 && (
            <Field data-invalid={!!form.formState.errors.value}>
              <FieldLabel htmlFor="value">Valor customizado (opcional)</FieldLabel>
              <Controller
                control={form.control}
                name="value"
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(selectedPlan.price)}
                      value={field.value ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value
                        field.onChange(
                          raw === "" ? undefined : Number.parseFloat(raw)
                        )
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </>
                )}
              />
            </Field>
          )}
          <Controller
            control={form.control}
            name="updatePendingPayments"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value ?? true}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
                Atualizar cobranças pendentes com novo valor
              </label>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending || plansQuery.isLoading}
              onClick={() => void submitForm()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
