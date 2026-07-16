"use client"

import { useState } from "react"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { useAssignUserToCompany, useCreateUser } from "../users-queries"
import { createUserSchema, type CreateUserInput } from "../schemas"
import { UserSelect } from "./user-select"

type Mode = "existing" | "new"

export function AddUserToCompanyDialog({
  open,
  onOpenChange,
  companyId,
  excludeUserIds = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  excludeUserIds?: string[]
}) {
  const [mode, setMode] = useState<Mode>("existing")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const assignMutation = useAssignUserToCompany()
  const createMutation = useCreateUser()

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  const isPending = assignMutation.isPending || createMutation.isPending

  function resetState() {
    setMode("existing")
    setSelectedUserId(null)
    setSelectionError(null)
    form.reset({ name: "", email: "", phone: "", password: "" })
  }

  function handleClose(next: boolean) {
    if (isPending && !next) return
    if (!next) {
      resetState()
    }
    onOpenChange(next)
  }

  async function handleAssignExisting() {
    if (!selectedUserId) {
      setSelectionError("Selecione um usuário para vincular")
      return
    }
    setSelectionError(null)
    try {
      await assignMutation.mutateAsync({
        userId: selectedUserId,
        companyId,
      })
      resetState()
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  const onSubmitNew: SubmitHandler<CreateUserInput> = async (values) => {
    try {
      const created = await createMutation.mutateAsync(values)
      await assignMutation.mutateAsync({
        userId: created.id,
        companyId,
      })
      resetState()
      onOpenChange(false)
    } catch {
      // toasts handled in hooks
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar usuário</DialogTitle>
          <DialogDescription>
            Vincule um usuário existente à empresa ou crie um novo usuário e já
            vincule.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as Mode)}
          className="gap-4"
        >
          <TabsList>
            <TabsTrigger value="existing">Existente</TabsTrigger>
            <TabsTrigger value="new">Novo</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex flex-col gap-4">
            <Field data-invalid={!!selectionError}>
              <FieldLabel htmlFor="existing-user">Usuário</FieldLabel>
              <UserSelect
                id="existing-user"
                value={selectedUserId}
                onChange={(value) => {
                  setSelectedUserId(value)
                  if (value) setSelectionError(null)
                }}
                placeholder="Selecione um usuário"
                excludeIds={excludeUserIds}
              />
              <FieldError>{selectionError ?? undefined}</FieldError>
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAssignExisting}
                disabled={isPending}
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  "Vincular usuário"
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="new">
            <form
              onSubmit={form.handleSubmit(onSubmitNew)}
              className="flex flex-col gap-4"
            >
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="new-user-name">Nome</FieldLabel>
                  <Input
                    id="new-user-name"
                    {...form.register("name")}
                    autoComplete="name"
                  />
                  <FieldError>
                    {form.formState.errors.name?.message}
                  </FieldError>
                </Field>

                <Field data-invalid={!!form.formState.errors.email}>
                  <FieldLabel htmlFor="new-user-email">Email</FieldLabel>
                  <Input
                    id="new-user-email"
                    type="email"
                    {...form.register("email")}
                    autoComplete="email"
                  />
                  <FieldError>
                    {form.formState.errors.email?.message}
                  </FieldError>
                </Field>

                <Field data-invalid={!!form.formState.errors.phone}>
                  <FieldLabel htmlFor="new-user-phone">Telefone</FieldLabel>
                  <Input
                    id="new-user-phone"
                    placeholder="(11) 99999-9999"
                    {...form.register("phone")}
                  />
                  <FieldError>
                    {form.formState.errors.phone?.message}
                  </FieldError>
                </Field>

                <Field data-invalid={!!form.formState.errors.password}>
                  <FieldLabel htmlFor="new-user-password">Senha</FieldLabel>
                  <Input
                    id="new-user-password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  <FieldError>
                    {form.formState.errors.password?.message}
                  </FieldError>
                </Field>
              </FieldGroup>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar e vincular"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
