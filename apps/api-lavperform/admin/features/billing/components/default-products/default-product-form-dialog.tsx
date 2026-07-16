"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
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

import {
  defaultProductSchema,
  type DefaultProductInput,
} from "../../schemas"
import type { DefaultCreditProduct } from "../../types"

export function DefaultProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: DefaultCreditProduct | null
  onSubmit: (data: DefaultProductInput) => void
  isPending: boolean
}) {
  const form = useForm<DefaultProductInput>({
    resolver: zodResolver(defaultProductSchema),
    defaultValues: {
      name: "",
      code: "",
      priceCents: 100,
      active: true,
    },
  })

  useEffect(() => {
    if (open && product) {
      form.reset({
        name: product.name,
        code: product.code,
        description: product.description ?? "",
        priceCents: product.priceCents,
        active: product.active,
      })
    } else if (open) {
      form.reset({
        name: "",
        code: "",
        priceCents: 100,
        active: true,
      })
    }
  }, [open, product, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar oferta default" : "Nova oferta default"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="code">Código</FieldLabel>
            <Input
              id="code"
              {...form.register("code")}
              disabled={Boolean(product)}
            />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="priceCents">Preço (centavos)</FieldLabel>
            <Input
              id="priceCents"
              type="number"
              {...form.register("priceCents")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Input id="description" {...form.register("description")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
