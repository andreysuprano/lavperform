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
import { SelectValueLabel } from "@/components/select-value-label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { useUpdateSubscriptionStatus } from "../../billing-queries"
import {
  subscriptionStatusSchema,
  type SubscriptionStatusInput,
} from "../../schemas"
import { todayIsoDate } from "../../utils"

export function SubscriptionStatusDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useUpdateSubscriptionStatus(companyId)
  const form = useForm<SubscriptionStatusInput>({
    resolver: zodResolver(subscriptionStatusSchema),
    defaultValues: { status: "INACTIVE", nextDueDate: todayIsoDate() },
  })

  const status = form.watch("status")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar status da assinatura</DialogTitle>
          <DialogDescription>
            Suspender impede novas cobranças. Ao reativar, informe o próximo
            vencimento.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            mutation.mutate(data, { onSuccess: () => onOpenChange(false) })
          })}
        >
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v === "ACTIVE" || v === "INACTIVE")
                  form.setValue("status", v)
              }}
            >
              <SelectTrigger>
                <SelectValueLabel
                  labels={{
                    ACTIVE: "Ativa",
                    INACTIVE: "Inativa",
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativa</SelectItem>
                <SelectItem value="INACTIVE">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {status === "ACTIVE" && (
            <Field>
              <FieldLabel htmlFor="nextDueDate">Próximo vencimento</FieldLabel>
              <Input
                id="nextDueDate"
                type="date"
                {...form.register("nextDueDate")}
              />
              <FieldError errors={[form.formState.errors.nextDueDate]} />
            </Field>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
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
