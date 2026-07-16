import { z } from "zod"

import type { CompanyIntegration, IntegrationPartner } from "./types"

export const integrationFormSchema = z.object({
  partnerId: z.string().min(1, "Selecione um parceiro integrador"),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  merchantId: z.string().optional(),
  digitalMenuUrl: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.trim() === "" || z.string().url().safeParse(value).success,
      "URL inválida"
    ),
  active: z.boolean(),
})

export type IntegrationFormInput = z.infer<typeof integrationFormSchema>

export const importHistorySchema = z
  .object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true
      return data.startDate <= data.endDate
    },
    { message: "A data inicial deve ser anterior à data final", path: ["endDate"] }
  )

export type ImportHistoryInput = z.infer<typeof importHistorySchema>

export function validateIntegrationForm(
  partner: IntegrationPartner | undefined,
  values: IntegrationFormInput,
  mode: "create" | "edit",
  existing?: CompanyIntegration
): string | null {
  if (!partner) return "Parceiro integrador não encontrado"

  for (const field of partner.requiredFields) {
    const key = field as keyof IntegrationFormInput
    const value = values[key]
    if (typeof value === "string" && value.trim()) continue

    if (mode === "edit" && existing && fieldHasExistingValue(field, existing)) {
      continue
    }

    return `O campo "${field}" é obrigatório para ${partner.name}`
  }

  return null
}

export function buildCreatePayload(values: IntegrationFormInput) {
  return cleanupPayload({
    partnerId: values.partnerId,
    apiKey: values.apiKey,
    apiSecret: values.apiSecret,
    username: values.username,
    password: values.password,
    merchantId: values.merchantId,
    digitalMenuUrl: values.digitalMenuUrl,
    active: values.active,
  })
}

export function buildUpdatePayload(
  values: IntegrationFormInput,
  existing: CompanyIntegration
) {
  const payload: Record<string, unknown> = {}

  if (values.apiKey?.trim()) payload.apiKey = values.apiKey.trim()
  if (values.apiSecret?.trim()) payload.apiSecret = values.apiSecret.trim()
  if (values.username?.trim()) payload.username = values.username.trim()
  if (values.password?.trim()) payload.password = values.password.trim()
  if (values.merchantId?.trim()) payload.merchantId = values.merchantId.trim()
  if (values.digitalMenuUrl?.trim()) {
    payload.digitalMenuUrl = values.digitalMenuUrl.trim()
  }
  if (values.active !== existing.active) payload.active = values.active

  return payload
}

function fieldHasExistingValue(
  field: string,
  existing: CompanyIntegration
): boolean {
  switch (field) {
    case "apiKey":
      return existing.hasApiKey
    case "apiSecret":
      return existing.hasApiSecret
    case "username":
      return existing.hasUsername
    case "password":
      return existing.hasPassword
    case "merchantId":
      return Boolean(existing.merchantId)
    case "digitalMenuUrl":
      return Boolean(existing.digitalMenuUrl)
    default:
      return false
  }
}

function cleanupPayload<T extends Record<string, unknown>>(input: T): T {
  const output = { ...input }
  Object.keys(output).forEach((key) => {
    const value = output[key]
    if (typeof value === "string" && value.trim() === "") {
      delete output[key]
    }
  })
  return output
}
