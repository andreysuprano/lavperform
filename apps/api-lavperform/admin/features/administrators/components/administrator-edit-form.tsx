"use client"

import { useEffect, useState } from "react"
import { useAppRouter } from "@/hooks/use-app-router"
import { KeyRoundIcon, Loader2 } from "lucide-react"
import { Controller, useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

import {
  useAdministrator,
  useUpdateAdministrator,
} from "../administrators-queries"
import {
  updateAdministratorSchema,
  type UpdateAdministratorInput,
} from "../schemas"
import { normalizeAdminRole } from "../utils"
import { AdminRoleBadge } from "./admin-role-badge"
import { AdminRoleSelect } from "./admin-role-select"
import { ChangePasswordDialog } from "./change-password-dialog"

export function AdministratorEditForm({
  administratorId,
}: {
  administratorId: string
}) {
  const router = useAppRouter()
  const adminQuery = useAdministrator(administratorId)
  const updateMutation = useUpdateAdministrator(administratorId)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const form = useForm<UpdateAdministratorInput>({
    resolver: zodResolver(updateAdministratorSchema),
    defaultValues: {
      name: "",
      email: "",
      isActive: true,
      role: "SDR",
    },
  })

  useEffect(() => {
    const admin = adminQuery.data
    if (!admin) return
    form.reset({
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
      role: normalizeAdminRole(admin.role),
    })
  }, [adminQuery.data, form])

  const onSubmit: SubmitHandler<UpdateAdministratorInput> = async (values) => {
    try {
      await updateMutation.mutateAsync(values)
      router.push("/administrators")
    } catch {
      // Toast já é emitido pelo hook
    }
  }

  if (adminQuery.isLoading) {
    return (
      <div className="h-48 max-w-xl animate-pulse rounded-lg bg-muted" />
    )
  }

  if (!adminQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Administrador não encontrado.
      </p>
    )
  }

  const { errors } = form.formState
  const selectedRole = form.watch("role")
  const isSuperAdmin = selectedRole === "SUPER_ADMIN"

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-xl flex-col gap-4 md:gap-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Dados do administrador</CardTitle>
                <CardDescription>
                  Atualize nome, e-mail, tipo de usuário e status de acesso.
                </CardDescription>
              </div>
              <AdminRoleBadge role={form.watch("role")} />
            </div>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" {...form.register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input id="email" type="email" {...form.register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>

              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Field data-invalid={!!errors.role}>
                    <FieldLabel htmlFor="role">Tipo de usuário</FieldLabel>
                    <AdminRoleSelect
                      id="role"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                    <FieldDescription>
                      Altere o perfil de acesso deste usuário no painel.
                    </FieldDescription>
                    <FieldError errors={[errors.role]} />
                  </Field>
                )}
              />

              {!isSuperAdmin && (
                <Controller
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <FieldContent>
                        <FieldLabel htmlFor="isActive" className="mb-0">
                          Conta ativa
                        </FieldLabel>
                        <FieldDescription>
                          Desative para impedir o login deste administrador.
                        </FieldDescription>
                      </FieldContent>
                      <Checkbox
                        id="isActive"
                        className="shrink-0"
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </Field>
                  )}
                />
              )}
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senha</CardTitle>
            <CardDescription>
              Defina uma nova senha de acesso ao painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordOpen(true)}
            >
              <KeyRoundIcon />
              Alterar senha
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/administrators")}
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
        </div>
      </form>

      <ChangePasswordDialog
        administratorId={administratorId}
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
      />
    </>
  )
}
