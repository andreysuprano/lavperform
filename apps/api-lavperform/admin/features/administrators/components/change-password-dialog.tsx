"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
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

import { useChangeAdministratorPassword } from "../administrators-queries"
import {
  changeAdministratorPasswordSchema,
  type ChangeAdministratorPasswordInput,
} from "../schemas"

export function ChangePasswordDialog({
  administratorId,
  open,
  onOpenChange,
}: {
  administratorId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useChangeAdministratorPassword(administratorId)
  const form = useForm<ChangeAdministratorPasswordInput>({
    resolver: zodResolver(changeAdministratorPasswordSchema),
    defaultValues: { newPassword: "" },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((data) => {
            mutation.mutate(data, {
              onSuccess: () => {
                form.reset()
                onOpenChange(false)
              },
            })
          })}
        >
          <Field data-invalid={!!form.formState.errors.newPassword}>
            <FieldLabel htmlFor="newPassword">Nova senha</FieldLabel>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...form.register("newPassword")}
            />
            <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
            <FieldError errors={[form.formState.errors.newPassword]} />
          </Field>
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
                "Salvar senha"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
