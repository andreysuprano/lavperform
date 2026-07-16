"use client"

import { useAppRouter } from "@/hooks/use-app-router"
import { Loader2 } from "lucide-react"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useCreateAdministrator } from "../administrators-queries"
import {
  createAdministratorSchema,
  type CreateAdministratorInput,
} from "../schemas"
import { AdminRoleSelect } from "./admin-role-select"

export function AdministratorCreateForm() {
  const router = useAppRouter()
  const createMutation = useCreateAdministrator()

  const form = useForm<CreateAdministratorInput>({
    resolver: zodResolver(createAdministratorSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "SDR",
    },
  })

  const onSubmit: SubmitHandler<CreateAdministratorInput> = async (values) => {
    try {
      const created = await createMutation.mutateAsync(values)
      router.push(`/administrators/${created.id}/edit`)
    } catch {
      // Toast já é emitido pelo hook
    }
  }

  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-xl flex-col gap-4 md:gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dados do administrador</CardTitle>
          <CardDescription>
            Defina o tipo de usuário e as credenciais de acesso ao painel.
          </CardDescription>
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

            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Senha inicial</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
              />
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
              <FieldError errors={[errors.password]} />
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
                  <FieldError errors={[errors.role]} />
                </Field>
              )}
            />
          </FieldGroup>
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
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Criando...
            </>
          ) : (
            "Criar administrador"
          )}
        </Button>
      </div>
    </form>
  )
}
