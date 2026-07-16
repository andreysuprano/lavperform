"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { CompanySelect } from "@/features/campaigns/components/company-select"
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

import {
  updateAdminFieldsSchema,
  type UpdateAdminFieldsInput,
} from "../schemas"
import type { WhatsappInstanceListItem } from "../types"
import { useUpdateInstanceAdminFields } from "../whatsapp-queries"

export function EditAdminFieldsDialog({
  instance,
  open,
  onOpenChange,
}: {
  instance: WhatsappInstanceListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateMutation = useUpdateInstanceAdminFields(instance?.token ?? "")

  const form = useForm<UpdateAdminFieldsInput>({
    resolver: zodResolver(updateAdminFieldsSchema),
    defaultValues: getDefaultValues(instance),
  })

  useEffect(() => {
    if (!open) return
    form.reset(getDefaultValues(instance))
  }, [open, instance, form])

  function handleSubmit(values: UpdateAdminFieldsInput) {
    if (!instance) return
    updateMutation.mutate(values, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar campos administrativos</DialogTitle>
        </DialogHeader>

        {instance && (
          <p className="text-sm text-muted-foreground">
            Instância <span className="font-medium">{instance.name}</span>
          </p>
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="admin-field-01">adminField01</FieldLabel>
            <Input
              id="admin-field-01"
              placeholder="Nome da empresa"
              {...form.register("adminField01")}
            />
            <FieldDescription>Nome legível da empresa na UAZAPI.</FieldDescription>
            <FieldError>{form.formState.errors.adminField01?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-field-02">adminField02</FieldLabel>
            <Controller
              control={form.control}
              name="adminField02"
              render={({ field }) => (
                <CompanySelect
                  id="admin-field-02"
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? "")}
                  placeholder="Empresa vinculada"
                />
              )}
            />
            <FieldDescription>ID da empresa (companyId) na plataforma.</FieldDescription>
            <FieldError>{form.formState.errors.adminField02?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="system-name">systemName</FieldLabel>
            <Input
              id="system-name"
              placeholder="FoodCRM"
              {...form.register("systemName")}
            />
            <FieldDescription>
              Nome do sistema exibido na instância.
            </FieldDescription>
            <FieldError>{form.formState.errors.systemName?.message}</FieldError>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !instance}>
              {updateMutation.isPending ? (
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

function getDefaultValues(
  instance: WhatsappInstanceListItem | null
): UpdateAdminFieldsInput {
  return {
    adminField01: instance?.adminField01 ?? "",
    adminField02: instance?.adminField02 ?? "",
    systemName: instance?.systemName ?? "FoodCRM",
  }
}
