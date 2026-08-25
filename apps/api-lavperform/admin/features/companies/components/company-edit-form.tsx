"use client"

import { useEffect } from "react"
import { useAppRouter } from "@/hooks/use-app-router"
import { Loader2 } from "lucide-react"
import { Controller, FormProvider, useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useCompany, useUpdateCompany } from "../companies-queries"
import { updateCompanySchema, type UpdateCompanyInput } from "../schemas"
import { AddressFields } from "./address-fields"

const EMPTY_DEFAULTS: UpdateCompanyInput = {
  name: "",
  cnpj: "",
  email: "",
  phone: "",
  showIncentivizedSales: false,
  showTodayPurchases: false,
  address: {
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  },
}

export function CompanyEditForm({ companyId }: { companyId: string }) {
  const router = useAppRouter()
  const companyQuery = useCompany(companyId)
  const updateMutation = useUpdateCompany(companyId)

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: EMPTY_DEFAULTS,
  })

  useEffect(() => {
    const company = companyQuery.data
    if (!company) return
    form.reset({
      name: company.name,
      cnpj: company.cnpj,
      email: company.email,
      phone: company.phone ?? "",
      showIncentivizedSales: company.showIncentivizedSales === true,
      showTodayPurchases: company.showTodayPurchases === true,
      address: {
        zipCode: company.address?.zipCode ?? "",
        street: company.address?.street ?? "",
        number: company.address?.number ?? "",
        complement: company.address?.complement ?? "",
        neighborhood: company.address?.neighborhood ?? "",
        city: company.address?.city ?? "",
        state: company.address?.state ?? "",
      },
    })
  }, [companyQuery.data, form])

  const onSubmit: SubmitHandler<UpdateCompanyInput> = async (values) => {
    try {
      await updateMutation.mutateAsync(values)
      router.push(`/companies/${companyId}`)
    } catch {
      // Toast já é emitido pelo hook
    }
  }

  if (companyQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (companyQuery.error || !companyQuery.data) {
    return (
      <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
        Não foi possível carregar os dados da empresa.
      </div>
    )
  }

  const { errors } = form.formState

  return (
    <FormProvider {...form}>
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 md:gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>
            Dados básicos da empresa. O slug e o status não podem ser editados
            aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" {...form.register("name")} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.cnpj}>
                <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
                <Input
                  id="cnpj"
                  inputMode="numeric"
                  {...form.register("cnpj")}
                />
                <FieldError>{errors.cnpj?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" {...form.register("email")} />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="phone">Telefone</FieldLabel>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...form.register("phone")}
                />
                <FieldError>{errors.phone?.message}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>
            Atualize o endereço comercial da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressFields namePrefix="address" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Controle o que aparece na home do app desta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="showIncentivizedSales"
            render={({ field }) => (
              <Field orientation="horizontal" className="items-start gap-3">
                <Checkbox
                  id="showIncentivizedSales"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="showIncentivizedSales" className="mb-0">
                    Mostrar vendas incentivadas na dashboard
                  </FieldLabel>
                  <FieldDescription>
                    Quando ligado, o box aparece na home do app dessa empresa.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="showTodayPurchases"
            render={({ field }) => (
              <Field orientation="horizontal" className="items-start gap-3">
                <Checkbox
                  id="showTodayPurchases"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor="showTodayPurchases" className="mb-0">
                    Mostrar compras do dia na dashboard
                  </FieldLabel>
                  <FieldDescription>
                    Quando ligado, a lista interna do card Compras do dia
                    aparece na home. O cliente também controla isso pelo ícone
                    de olho no card.
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/companies/${companyId}`)}
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
      </div>
    </form>
    </FormProvider>
  )
}
