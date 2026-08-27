"use client"

import { useEffect } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

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

const schema = z.object({
  name: z.string().optional(),
  expiresAt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CreateApiKeyDialog({
  open,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FormValues) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      expiresAt: "",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova API key</DialogTitle>
          <DialogDescription>
            Chave para integração direta com a Public API da LavPerform.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <Field>
              <FieldLabel htmlFor="api-key-name">Nome (opcional)</FieldLabel>
              <Input
                id="api-key-name"
                placeholder="Integração PDV - Loja Centro"
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key-expires">Expira em (opcional)</FieldLabel>
              <Input
                id="api-key-expires"
                type="datetime-local"
                {...form.register("expiresAt")}
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar API key"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
