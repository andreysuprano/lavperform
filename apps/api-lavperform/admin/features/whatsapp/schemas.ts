import { z } from "zod"

export const createInstanceSchema = z.object({
  name: z
    .string()
    .min(1, "Informe o nome da instância")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens (sem espaços)"
    ),
  companyId: z.string().uuid("Selecione uma empresa"),
})

export type CreateInstanceInput = z.infer<typeof createInstanceSchema>

export const updateAdminFieldsSchema = z.object({
  adminField01: z.string().optional(),
  adminField02: z.string().uuid("ID da empresa inválido").optional().or(z.literal("")),
  systemName: z.string().optional(),
})

export type UpdateAdminFieldsInput = z.infer<typeof updateAdminFieldsSchema>

export const globalWebhookSchema = z.object({
  enabled: z.boolean(),
  url: z.string().url("Informe uma URL válida"),
  events: z.string().optional(),
})

export type GlobalWebhookInput = z.infer<typeof globalWebhookSchema>

export function buildAdminFieldsPayload(input: UpdateAdminFieldsInput) {
  const payload: Record<string, string> = {}

  if (input.adminField01?.trim()) {
    payload.adminField01 = input.adminField01.trim()
  }

  if (input.adminField02?.trim()) {
    payload.adminField02 = input.adminField02.trim()
  }

  if (input.systemName?.trim()) {
    payload.systemName = input.systemName.trim()
  }

  return payload
}

export function buildWebhookPayload(input: GlobalWebhookInput) {
  const events = input.events
    ?.split(",")
    .map((event) => event.trim())
    .filter(Boolean)

  return {
    enabled: input.enabled,
    url: input.url.trim(),
    ...(events && events.length > 0 ? { events } : {}),
  }
}
