"use client"

import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useUpdateUser } from "../users-queries"
import { updateUserSchema, type UpdateUserInput } from "../schemas"
import type { CompanyUser } from "@/features/companies/types"

export function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: CompanyUser | null
}) {
  const updateMutation = useUpdateUser(user?.id ?? "")

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  })

  useEffect(() => {
    if (open && user) {
      form.reset({
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
      })
    }
    if (!open) {
      form.reset({ name: "", email: "", phone: "" })
    }
  }, [open, user, form])

  const onSubmit: SubmitHandler<UpdateUserInput> = async (values) => {
    if (!user) return
    try {
      await updateMutation.mutateAsync(values)
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  function handleOpenChange(next: boolean) {
    if (updateMutation.isPending && !next) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Atualize nome, email e telefone do usuário.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-user-name">Nome</FieldLabel>
              <Input
                id="edit-user-name"
                {...form.register("name")}
                autoComplete="name"
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="edit-user-email">Email</FieldLabel>
              <Input
                id="edit-user-email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
              <FieldError>{form.formState.errors.email?.message}</FieldError>
            </Field>

            <Field data-invalid={!!form.formState.errors.phone}>
              <FieldLabel htmlFor="edit-user-phone">Telefone</FieldLabel>
              <Input
                id="edit-user-phone"
                placeholder="(11) 99999-9999"
                {...form.register("phone")}
              />
              <FieldError>{form.formState.errors.phone?.message}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
