"use client"

import { useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { SelectValueLabel } from "@/components/select-value-label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { useIsSuperAdmin } from "@/hooks/use-is-super-admin"

import {
  useCreateTopup,
  useGrantPlatformCredits,
} from "../../billing-queries"
import { addCreditsFormSchema, type AddCreditsFormInput } from "../../schemas"
import { billingTypeLabel, paymentMethodLabel } from "../../utils"

const PAYMENT_METHOD_LABELS = {
  PIX: billingTypeLabel("PIX"),
  CREDIT_CARD: billingTypeLabel("CREDIT_CARD"),
  DEBIT_CARD: billingTypeLabel("DEBIT_CARD"),
  PLATFORM: paymentMethodLabel("PLATFORM"),
}

export function CreateTopupDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isSuperAdmin = useIsSuperAdmin()
  const createMutation = useCreateTopup(companyId)
  const grantMutation = useGrantPlatformCredits(companyId)
  const form = useForm<AddCreditsFormInput>({
    resolver: zodResolver(addCreditsFormSchema),
    defaultValues: { paymentMethod: "PIX", amountCents: 5000, reason: "" },
  })

  const paymentMethod = form.watch("paymentMethod")
  const isVoucher = paymentMethod === "PLATFORM"

  useEffect(() => {
    if (!isSuperAdmin && paymentMethod === "PLATFORM") {
      form.setValue("paymentMethod", "PIX")
    }
  }, [form, isSuperAdmin, paymentMethod])
  const isPending = createMutation.isPending || grantMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar créditos</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            const onSuccess = () => onOpenChange(false)

            if (data.paymentMethod === "PLATFORM") {
              grantMutation.mutate(
                {
                  amountCents: data.amountCents,
                  reason: data.reason?.trim() || undefined,
                },
                { onSuccess }
              )
              return
            }

            createMutation.mutate(
              {
                paymentMethod: data.paymentMethod,
                amountCents: data.amountCents,
              },
              { onSuccess }
            )
          })}
        >
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                if (
                  v === "PIX" ||
                  v === "CREDIT_CARD" ||
                  v === "DEBIT_CARD" ||
                  v === "PLATFORM"
                ) {
                  form.setValue("paymentMethod", v)
                }
              }}
            >
              <SelectTrigger>
                <SelectValueLabel labels={PAYMENT_METHOD_LABELS} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIX">Pix — recarga paga</SelectItem>
                <SelectItem value="CREDIT_CARD">
                  Cartão de crédito — recarga paga
                </SelectItem>
                <SelectItem value="DEBIT_CARD">
                  Cartão de débito — recarga paga
                </SelectItem>
                {isSuperAdmin ? (
                  <SelectItem value="PLATFORM">
                    Voucher plataforma — sem cobrança
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </Field>
          {isVoucher && (
            <p className="text-sm text-muted-foreground">
              Credita o saldo imediatamente, sem gerar cobrança no Asaas.
            </p>
          )}
          <Field>
            <FieldLabel htmlFor="amountCents">Valor (centavos)</FieldLabel>
            <Input
              id="amountCents"
              type="number"
              {...form.register("amountCents", { valueAsNumber: true })}
            />
            <FieldError errors={[form.formState.errors.amountCents]} />
          </Field>
          {isVoucher && (
            <Field>
              <FieldLabel htmlFor="reason">Motivo (opcional)</FieldLabel>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Ex.: bônus de onboarding, compensação..."
                {...form.register("reason")}
              />
              <FieldError errors={[form.formState.errors.reason]} />
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {isVoucher ? "Concedendo..." : "Criando..."}
                </>
              ) : isVoucher ? (
                "Conceder créditos"
              ) : (
                "Criar recarga"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
