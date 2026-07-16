"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { SelectValueLabel } from "@/components/select-value-label"

import { planSchema, type PlanInput } from "../../schemas"
import type { CycleType, Plan } from "../../types"
import { cycleLabel } from "../../utils"

const CYCLE_VALUES: CycleType[] = [
  "MONTHLY",
  "YEARLY",
  "SEMIANNUALLY",
  "QUARTERLY",
]

const CYCLE_LABELS = Object.fromEntries(
  CYCLE_VALUES.map((cycle) => [cycle, cycleLabel(cycle)])
) as Record<CycleType, string>

export function PlanFormDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: Plan | null
  onSubmit: (data: PlanInput) => void
  isPending: boolean
}) {
  const form = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      cycle: "MONTHLY",
      recommended: false,
      maxPayments: 1,
      active: true,
      allowBoleto: false,
      allowPix: false,
    },
  })

  useEffect(() => {
    if (open && plan) {
      form.reset({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        cycle: plan.cycle,
        recommended: plan.recommended,
        maxPayments: plan.maxPayments,
        endDate: plan.endDate?.slice(0, 10) ?? "",
        active: plan.active,
        allowBoleto: plan.allowBoleto ?? false,
        allowPix: plan.allowPix ?? false,
      })
    } else if (open) {
      form.reset({
        name: "",
        description: "",
        price: 0,
        cycle: "MONTHLY",
        recommended: false,
        maxPayments: 1,
        endDate: "",
        active: true,
        allowBoleto: false,
        allowPix: false,
      })
    }
  }, [open, plan, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="plan-name">Nome</FieldLabel>
            <Input id="plan-name" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.description}>
            <FieldLabel htmlFor="plan-description">Descrição</FieldLabel>
            <Input id="plan-description" {...form.register("description")} />
            <FieldDescription>
              Texto usado nas cobranças e assinaturas Asaas.
            </FieldDescription>
            <FieldError errors={[form.formState.errors.description]} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field data-invalid={!!form.formState.errors.price}>
              <FieldLabel htmlFor="plan-price">Preço (R$)</FieldLabel>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                min="0"
                {...form.register("price", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.price]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.cycle}>
              <FieldLabel>Ciclo</FieldLabel>
              <Controller
                control={form.control}
                name="cycle"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (typeof value === "string") field.onChange(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValueLabel labels={CYCLE_LABELS} />
                    </SelectTrigger>
                    <SelectContent>
                      {CYCLE_VALUES.map((cycle) => (
                        <SelectItem key={cycle} value={cycle}>
                          {CYCLE_LABELS[cycle]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[form.formState.errors.cycle]} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="plan-max-payments">Máx. cobranças</FieldLabel>
              <Input
                id="plan-max-payments"
                type="number"
                min="0"
                {...form.register("maxPayments", { valueAsNumber: true })}
              />
              <FieldDescription>0 = ilimitado no Asaas.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="plan-end-date">Encerramento</FieldLabel>
              <Input
                id="plan-end-date"
                type="date"
                {...form.register("endDate")}
              />
            </Field>
          </div>

          <Controller
            control={form.control}
            name="recommended"
            render={({ field }) => (
              <Field orientation="horizontal" className="items-center gap-3">
                <Checkbox
                  id="plan-recommended"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <FieldContent>
                  <FieldLabel htmlFor="plan-recommended" className="mb-0">
                    Plano recomendado
                  </FieldLabel>
                  <FieldDescription>
                    Destaca este plano no onboarding.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />

          <Field>
            <FieldLabel>Formas de pagamento alternativas</FieldLabel>
            <FieldDescription>
              Cartão de crédito é sempre o método primário. Boleto e Pix só
              aparecem para o cliente se habilitados aqui.
            </FieldDescription>
            <div className="mt-2 flex flex-col gap-2">
              <Controller
                control={form.control}
                name="allowBoleto"
                render={({ field }) => (
                  <Field orientation="horizontal" className="items-center gap-3">
                    <Checkbox
                      id="plan-allow-boleto"
                      checked={field.value ?? false}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <FieldLabel htmlFor="plan-allow-boleto" className="mb-0">
                      Permitir boleto
                    </FieldLabel>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="allowPix"
                render={({ field }) => (
                  <Field orientation="horizontal" className="items-center gap-3">
                    <Checkbox
                      id="plan-allow-pix"
                      checked={field.value ?? false}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <FieldLabel htmlFor="plan-allow-pix" className="mb-0">
                      Permitir Pix
                    </FieldLabel>
                  </Field>
                )}
              />
            </div>
          </Field>

          {plan && (
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <Field orientation="horizontal" className="items-center gap-3">
                  <Checkbox
                    id="plan-active"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="plan-active" className="mb-0">
                      Plano ativo
                    </FieldLabel>
                    <FieldDescription>
                      Planos inativos não aparecem para novas assinaturas.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
