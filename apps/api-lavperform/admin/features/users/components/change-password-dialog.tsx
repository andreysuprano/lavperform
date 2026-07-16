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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useChangeUserPassword } from "../users-queries"
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "../schemas"

export function ChangePasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  userName?: string
}) {
  const changeMutation = useChangeUserPassword(userId ?? "")

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset({ newPassword: "", confirmPassword: "" })
    }
  }, [open, form])

  const onSubmit: SubmitHandler<ChangePasswordInput> = async (values) => {
    if (!userId) return
    try {
      await changeMutation.mutateAsync(values.newPassword)
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  function handleOpenChange(next: boolean) {
    if (changeMutation.isPending && !next) return
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>
            {userName ? (
              <>
                Defina uma nova senha para{" "}
                <span className="font-medium text-foreground">{userName}</span>.
              </>
            ) : (
              "Defina uma nova senha para o usuário."
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.newPassword}>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                {...form.register("newPassword")}
              />
              <FieldDescription>Mínimo de 6 caracteres.</FieldDescription>
              <FieldError>
                {form.formState.errors.newPassword?.message}
              </FieldError>
            </Field>

            <Field data-invalid={!!form.formState.errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">Confirmar senha</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmPassword")}
              />
              <FieldError>
                {form.formState.errors.confirmPassword?.message}
              </FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={changeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={changeMutation.isPending}>
              {changeMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                "Trocar senha"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
