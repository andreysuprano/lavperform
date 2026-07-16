"use client"

import { useEffect, useRef } from "react"
import { useAppRouter } from "@/hooks/use-app-router"
import { Loader2 } from "lucide-react"
import {
  Controller,
  FormProvider,
  useForm,
  type SubmitHandler,
} from "react-hook-form"
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
import { BusinessPartnerSelect } from "@/features/business-partners/components/business-partner-select"

import { useCreateCompany } from "../companies-queries"
import { createCompanySchema, type CreateCompanyInput } from "../schemas"
import { slugify } from "../utils"
import { AddressFields } from "./address-fields"

export function CompanyCreateForm() {
  const router = useAppRouter()
  const createMutation = useCreateCompany()

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      slug: "",
      name: "",
      cnpj: "",
      email: "",
      phone: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      businessPartnerId: "",
    },
  })

  const slugTouchedRef = useRef(false)
  const nameValue = form.watch("name")

  useEffect(() => {
    if (slugTouchedRef.current) return
    const current = form.getValues("slug")
    const generated = slugify(nameValue ?? "")
    if (generated !== current) {
      form.setValue("slug", generated, { shouldValidate: false })
    }
  }, [nameValue, form])

  const onSubmit: SubmitHandler<CreateCompanyInput> = async (values) => {
    try {
      const created = await createMutation.mutateAsync(values)
      router.push(`/companies/${created.id}`)
    } catch {
      // Toast já é emitido pelo hook
    }
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
            Dados básicos de cadastro da empresa.
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

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="slug">Slug</FieldLabel>
                <Input
                  id="slug"
                  {...form.register("slug", {
                    onChange: () => {
                      slugTouchedRef.current = true
                    },
                  })}
                  placeholder="ex: pizzaria-exemplo"
                />
                <FieldError>{errors.slug?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.cnpj}>
                <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
                <Input
                  id="cnpj"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  {...form.register("cnpj")}
                />
                <FieldError>{errors.cnpj?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  {...form.register("email")}
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
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
            Endereço comercial da empresa. Preencha o CEP para autocompletar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddressFields />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avançado</CardTitle>
          <CardDescription>Configurações opcionais.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.businessPartnerId}>
              <FieldLabel htmlFor="businessPartnerId">
                Parceiro de negócio
              </FieldLabel>
              <Controller
                control={form.control}
                name="businessPartnerId"
                render={({ field }) => (
                  <BusinessPartnerSelect
                    id="businessPartnerId"
                    value={field.value ?? null}
                    onChange={(value) => field.onChange(value ?? "")}
                  />
                )}
              />
              <FieldDescription>
                Selecione o parceiro responsável por esta empresa (opcional).
              </FieldDescription>
              <FieldError>{errors.businessPartnerId?.message}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/companies")}
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
            "Criar empresa"
          )}
        </Button>
      </div>
    </form>
    </FormProvider>
  )
}
