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

import { useRecoverTopup } from "../../billing-queries"
import { recoverTopupSchema, type RecoverTopupInput } from "../../schemas"

export function RecoverTopupDialog({
  companyId,
  open,
  onOpenChange,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useRecoverTopup(companyId)
  const form = useForm<RecoverTopupInput>({
    resolver: zodResolver(recoverTopupSchema),
    defaultValues: { asaasChargeId: "" },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recuperar recarga órfã</DialogTitle>
          <DialogDescription>
            Vincula uma cobrança avulsa existente no Asaas a uma recarga local.
            Não use para cobranças de assinatura.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            mutation.mutate(data.asaasChargeId, {
              onSuccess: () => onOpenChange(false),
            })
          })}
        >
          <Field>
            <FieldLabel htmlFor="asaasChargeId">ID cobrança Asaas</FieldLabel>
            <Input id="asaasChargeId" {...form.register("asaasChargeId")} />
            <FieldError errors={[form.formState.errors.asaasChargeId]} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Recuperando...
                </>
              ) : (
                "Recuperar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
