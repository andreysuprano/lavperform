"use client"

import { Controller, useFormContext } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { IntegrationFormInput } from "../schemas"
import type { IntegrationFieldName, IntegrationPartner } from "../types"
import { getVisibleFields, integrationFieldLabel } from "../utils"

export function IntegrationFields({
  partner,
  mode,
  revealSecrets,
}: {
  partner: IntegrationPartner | null
  mode: "create" | "edit"
  revealSecrets?: boolean
}) {
  const form = useFormContext<IntegrationFormInput>()
  const visibleFields = getVisibleFields(partner)

  if (!partner) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecione um parceiro integrador para exibir os campos de credenciais.
      </p>
    )
  }

  if (visibleFields.length === 0 && partner.partnerSlug === "CONSUMER") {
    return (
      <p className="text-sm text-muted-foreground">
        O Consumer recebe pedidos apenas via webhook. Não são necessárias
        credenciais adicionais.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {visibleFields.map((fieldName) => (
        <CredentialField
          key={fieldName}
          fieldName={fieldName}
          required={partner.requiredFields.includes(fieldName)}
          mode={mode}
          revealSecrets={revealSecrets}
        />
      ))}

      <Controller
        name="active"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal" className="items-center gap-3">
            <Checkbox
              id="integration-active"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="integration-active" className="mb-0">
                Integração ativa
              </FieldLabel>
              <FieldDescription>
                Integrações inativas não processam pedidos nem importações.
              </FieldDescription>
            </div>
          </Field>
        )}
      />
    </div>
  )
}

function CredentialField({
  fieldName,
  required,
  mode,
  revealSecrets,
}: {
  fieldName: IntegrationFieldName
  required: boolean
  mode: "create" | "edit"
  revealSecrets?: boolean
}) {
  const form = useFormContext<IntegrationFormInput>()
  const isSecret =
    fieldName === "apiKey" ||
    fieldName === "apiSecret" ||
    fieldName === "password"

  const placeholder =
    mode === "edit" && isSecret && !revealSecrets
      ? "Deixe em branco para manter o valor atual"
      : undefined

  return (
    <Field>
      <FieldLabel htmlFor={fieldName}>
        {integrationFieldLabel(fieldName)}
        {required ? " *" : ""}
      </FieldLabel>
      <Input
        id={fieldName}
        type={
          fieldName === "password" || fieldName === "apiSecret"
            ? "password"
            : fieldName === "digitalMenuUrl"
              ? "url"
              : "text"
        }
        placeholder={placeholder}
        autoComplete="off"
        {...form.register(fieldName)}
      />
      <FieldError errors={[form.formState.errors[fieldName]]} />
    </Field>
  )
}
