"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
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
import { Checkbox } from "@/components/ui/checkbox"

import {
  receiveInCashSchema,
  type ReceiveInCashInput,
} from "../../schemas"
import { todayIsoDate } from "../../utils"

export function ReceiveInCashDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  defaultValue,
  title = "Confirmar recebimento em dinheiro",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReceiveInCashInput) => void
  isPending: boolean
  defaultValue?: number
  title?: string
}) {
  const form = useForm<ReceiveInCashInput>({
    resolver: zodResolver(receiveInCashSchema),
    defaultValues: {
      paymentDate: todayIsoDate(),
      value: defaultValue ?? 0,
      notifyCustomer: false,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Marca o pagamento como recebido fora do fluxo financeiro do Asaas.
            Isso não credita saldo na conta — apenas atualiza o histórico.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="paymentDate">Data do pagamento</FieldLabel>
            <Input
              id="paymentDate"
              type="date"
              {...form.register("paymentDate")}
            />
            <FieldError errors={[form.formState.errors.paymentDate]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="value">Valor (R$)</FieldLabel>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...form.register("value")}
            />
            <FieldError errors={[form.formState.errors.value]} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("notifyCustomer")}
              onCheckedChange={(v) =>
                form.setValue("notifyCustomer", Boolean(v))
              }
            />
            Notificar cliente
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Confirmando...
                </>
              ) : (
                "Confirmar baixa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
