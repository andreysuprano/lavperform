"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { FormProvider, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import {
  useCreateCompanyIntegration,
  useIntegrationPartners,
  useUpdateCompanyIntegration,
} from "../integrations-queries"
import {
  buildCreatePayload,
  buildUpdatePayload,
  integrationFormSchema,
  validateIntegrationForm,
  type IntegrationFormInput,
} from "../schemas"
import type { CompanyIntegration } from "../types"
import { IntegrationFields } from "./integration-fields"
import { PartnerSelect } from "./partner-select"

export function IntegrationFormDialog({
  companyId,
  open,
  onOpenChange,
  mode,
  integration,
}: {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  integration?: CompanyIntegration
}) {
  const partnersQuery = useIntegrationPartners()
  const createMutation = useCreateCompanyIntegration(companyId)
  const updateMutation = useUpdateCompanyIntegration(
    companyId,
    integration?.id ?? ""
  )

  const [revealSecrets, setRevealSecrets] = useState(false)

  const form = useForm<IntegrationFormInput>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: getDefaultValues(integration),
  })

  const partnerId = form.watch("partnerId")
  const selectedPartner = useMemo(() => {
    const resolvedId =
      mode === "edit" ? integration?.partnerId ?? partnerId : partnerId
    return (partnersQuery.data ?? []).find((p) => p.id === resolvedId) ?? null
  }, [partnersQuery.data, partnerId, mode, integration?.partnerId])

  useEffect(() => {
    if (!open) return
    form.reset(getDefaultValues(integration))
    setRevealSecrets(false)
  }, [open, integration, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(values: IntegrationFormInput) {
    const partner =
      selectedPartner ??
      (partnersQuery.data ?? []).find((p) => p.id === values.partnerId)

    const validationError = validateIntegrationForm(
      partner,
      values,
      mode,
      integration
    )
    if (validationError) {
      form.setError("root", { message: validationError })
      return
    }

    if (mode === "create") {
      createMutation.mutate(buildCreatePayload(values), {
        onSuccess: () => onOpenChange(false),
      })
      return
    }

    if (!integration) return

    updateMutation.mutate(buildUpdatePayload(values, integration), {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova integração" : "Editar integração"}
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...form}>
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {mode === "create" ? (
              <Field>
                <FieldLabel>Parceiro integrador *</FieldLabel>
                <PartnerSelect
                  value={partnerId}
                  onChange={(value) => form.setValue("partnerId", value)}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>Parceiro integrador</FieldLabel>
                <p className="text-sm font-medium">
                  {integration?.partner?.name ?? "—"}
                </p>
                <FieldDescription>
                  O parceiro não pode ser alterado após a criação.
                </FieldDescription>
              </Field>
            )}

            {mode === "edit" && (
              <Field orientation="horizontal" className="items-center gap-3">
                <Checkbox
                  id="reveal-secrets"
                  checked={revealSecrets}
                  onCheckedChange={(checked) =>
                    setRevealSecrets(checked === true)
                  }
                />
                <FieldLabel htmlFor="reveal-secrets" className="mb-0">
                  Exibir credenciais salvas
                </FieldLabel>
              </Field>
            )}

            <IntegrationFields
              partner={selectedPartner}
              mode={mode}
              revealSecrets={revealSecrets}
            />

            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

function getDefaultValues(
  integration?: CompanyIntegration
): IntegrationFormInput {
  if (!integration) {
    return {
      partnerId: "",
      apiKey: "",
      apiSecret: "",
      username: "",
      password: "",
      merchantId: "",
      digitalMenuUrl: "",
      active: true,
    }
  }

  return {
    partnerId: integration.partnerId ?? "",
    apiKey: "",
    apiSecret: "",
    username: "",
    password: "",
    merchantId: integration.merchantId ?? "",
    digitalMenuUrl: integration.digitalMenuUrl ?? "",
    active: integration.active,
  }
}
