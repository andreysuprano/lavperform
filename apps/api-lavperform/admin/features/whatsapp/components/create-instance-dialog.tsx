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

import { useCreateWhatsappInstance } from "../whatsapp-queries"
import { createInstanceSchema, type CreateInstanceInput } from "../schemas"
import { slugifyInstanceName } from "../utils"

export function CreateInstanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMutation = useCreateWhatsappInstance()

  const form = useForm<CreateInstanceInput>({
    resolver: zodResolver(createInstanceSchema),
    defaultValues: {
      name: "",
      companyId: "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({ name: "", companyId: "" })
  }, [open, form])

  function handleSubmit(values: CreateInstanceInput) {
    createMutation.mutate(values, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova instância UAZAPI</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="instance-name">Nome da instância</FieldLabel>
            <Input
              id="instance-name"
              placeholder="pizzaria-exemplo"
              {...form.register("name", {
                onChange: (event) => {
                  const slug = slugifyInstanceName(event.target.value)
                  form.setValue("name", slug, { shouldValidate: true })
                },
              })}
            />
            <FieldDescription>
              Cria a instância na UAZAPI com token gerado automaticamente e
              persiste o vínculo com a empresa no banco.
            </FieldDescription>
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="instance-company">Empresa</FieldLabel>
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <CompanySelect
                  id="instance-company"
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? "")}
                  placeholder="Selecione a empresa"
                />
              )}
            />
            <FieldDescription>
              O ID será salvo em adminField02 na UAZAPI.
            </FieldDescription>
            <FieldError>{form.formState.errors.companyId?.message}</FieldError>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar instância"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
