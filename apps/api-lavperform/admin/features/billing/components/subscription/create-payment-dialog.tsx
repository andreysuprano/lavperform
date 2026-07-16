"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SelectValueLabel } from "@/components/select-value-label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { billingTypeLabel } from "../../utils"

import { useCreatePayment } from "../../billing-queries"
import { createPaymentSchema, type CreatePaymentInput } from "../../schemas"
import { todayIsoDate } from "../../utils"

const BILLING_TYPES = ["PIX", "BOLETO", "CREDIT_CARD", "UNDEFINED"] as const

const BILLING_TYPE_LABELS = Object.fromEntries(
  BILLING_TYPES.map((type) => [type, billingTypeLabel(type)])
)

export function CreatePaymentDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useCreatePayment(companyId)
  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      billingType: "PIX",
      value: 0,
      dueDate: todayIsoDate(),
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança avulsa</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            mutation.mutate(data, { onSuccess: () => onOpenChange(false) })
          })}
        >
          <Field>
            <FieldLabel>Forma de pagamento</FieldLabel>
            <Select
              value={form.watch("billingType")}
              onValueChange={(v) => {
                if (typeof v === "string") form.setValue("billingType", v)
              }}
            >
              <SelectTrigger>
                <SelectValueLabel labels={BILLING_TYPE_LABELS} />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {BILLING_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="value">Valor (R$)</FieldLabel>
            <Input id="value" type="number" step="0.01" {...form.register("value")} />
            <FieldError errors={[form.formState.errors.value]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="dueDate">Vencimento</FieldLabel>
            <Input id="dueDate" type="date" {...form.register("dueDate")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Input id="description" {...form.register("description")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar cobrança"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
