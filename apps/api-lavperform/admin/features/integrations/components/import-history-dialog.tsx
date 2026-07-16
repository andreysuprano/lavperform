"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { HistoryIcon, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useImportIntegrationHistory } from "../integrations-queries"
import { importHistorySchema, type ImportHistoryInput } from "../schemas"
import type { CompanyIntegration, IntegrationPartner } from "../types"
import { defaultImportDateRange } from "../utils"

export function ImportHistoryDialog({
  companyId,
  integration,
  partner,
  open,
  onOpenChange,
}: {
  companyId: string
  integration: CompanyIntegration
  partner: IntegrationPartner | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const defaults = defaultImportDateRange()
  const mutation = useImportIntegrationHistory(companyId, integration.id)

  const form = useForm<ImportHistoryInput>({
    resolver: zodResolver(importHistorySchema),
    defaultValues: {
      startDate: defaults.startDate,
      endDate: defaults.endDate,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="size-5" />
            Importar histórico
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Dispara a importação retroativa de pedidos para{" "}
          <span className="font-medium text-foreground">
            {integration.partner?.name ?? "esta integração"}
          </span>
          . O processamento ocorre em filas e pode levar vários minutos.
        </p>

        {partner && !partner.supportsImportHistory && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Este parceiro não suporta importação de histórico.
          </p>
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            mutation.mutate(data, { onSuccess: () => onOpenChange(false) })
          })}
        >
          <Field>
            <FieldLabel htmlFor="startDate">Data inicial</FieldLabel>
            <Input id="startDate" type="date" {...form.register("startDate")} />
            <FieldDescription>
              Sugestão inicial: últimos 90 dias. Você pode escolher qualquer intervalo.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="endDate">Data final</FieldLabel>
            <Input id="endDate" type="date" {...form.register("endDate")} />
            <FieldError errors={[form.formState.errors.endDate]} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !partner?.supportsImportHistory}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Iniciando...
                </>
              ) : (
                "Iniciar importação"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
