"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"

import { SelectValueLookup } from "@/components/select-value-label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { useChangePlan, usePlans } from "../../billing-queries"
import { assignPlanSchema, type AssignPlanInput } from "../../schemas"
import { formatBRL } from "../../utils"

export function AssignPlanCard({ companyId }: { companyId: string }) {
  const plansQuery = usePlans()
  const mutation = useChangePlan(companyId)

  const form = useForm<AssignPlanInput>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues: { planId: "" },
  })

  const planById = useMemo(
    () => new Map((plansQuery.data ?? []).map((plan) => [plan.id, plan])),
    [plansQuery.data]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vincular plano</CardTitle>
        <CardDescription>
          Selecione um plano ativo para criar a assinatura desta empresa no
          sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        >
          <Field className="flex-1">
            <FieldLabel>Plano disponível</FieldLabel>
            <Select
              value={form.watch("planId")}
              onValueChange={(value) => {
                if (typeof value === "string") form.setValue("planId", value)
              }}
            >
              <SelectTrigger>
                {plansQuery.isLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Carregando planos...
                  </span>
                ) : (
                  <SelectValueLookup
                    placeholder="Selecione um plano"
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
                {(plansQuery.data ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} — {formatBRL(plan.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[form.formState.errors.planId]} />
            {!plansQuery.isLoading && (plansQuery.data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">
                Cadastre planos ativos em{" "}
                <Link href="/billing/plans" className="underline underline-offset-4">
                  Planos de assinatura
                </Link>
                .
              </p>
            )}
          </Field>

          <Button type="submit" disabled={mutation.isPending || plansQuery.isLoading}>
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Vinculando...
              </>
            ) : (
              "Vincular plano"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
