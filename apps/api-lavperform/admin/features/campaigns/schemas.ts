import { z } from "zod"

import {
  AUTOMATIC_CAMPAIGN_STATUS_VALUES,
  AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  CAMPAIGN_CHANNEL_VALUES,
  CAMPAIGN_STATUS_VALUES,
  CREATABLE_AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  MESSAGE_STATUS_VALUES,
  type AutomaticCampaignStatus,
  type AutomaticCampaignType,
  type CampaignChannel,
  type CampaignStatus,
  type MessageStatus,
} from "./types"

const requiredString = (label: string) =>
  z
    .string({ message: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)

const uuidSchema = z
  .string({ message: "ID inválido" })
  .uuid("ID inválido")

const optionalUrl = z
  .string()
  .trim()
  .url("URL inválida")
  .optional()
  .or(z.literal(""))

export const giftSchema = z.object({
  type: requiredString("Tipo"),
  unit: requiredString("Unidade"),
  value: z.number({ message: "Valor inválido" }).min(0, "Valor inválido"),
})

export const creativeSchema = z.object({
  title: requiredString("Título"),
  message: requiredString("Mensagem"),
  imageUrls: z.array(z.string().trim()).default([]),
  link: z.string().trim().url("URL inválida").optional().or(z.literal("")).nullable(),
})

export const createCampaignSchema = z.object({
  companyId: uuidSchema,
  name: requiredString("Nome"),
  scheduledDate: requiredString("Data agendada"),
  messageText: requiredString("Mensagem"),
  segmentation: requiredString("Segmentação"),
  maxDailySends: z.number().int().min(1).default(50),
  imageUrl: optionalUrl,
  modifiedByAI: z.boolean().default(false),
  channel: z
    .enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]])
    .default("WHATSAPP_WEB"),
})

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>

export const updateCampaignSchema = z.object({
  companyId: uuidSchema.optional(),
  name: requiredString("Nome").optional(),
  scheduledDate: requiredString("Data agendada").optional(),
  messageText: requiredString("Mensagem").optional(),
  segmentation: requiredString("Segmentação").optional(),
  maxDailySends: z.number().int().min(1).optional(),
  imageUrl: z.string().trim().nullable().optional(),
  modifiedByAI: z.boolean().optional(),
  channel: z
    .enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]])
    .optional(),
  status: z
    .enum(CAMPAIGN_STATUS_VALUES as [CampaignStatus, ...CampaignStatus[]])
    .optional(),
  trakingCode: z.string().trim().nullable().optional(),
})

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>

const automaticCampaignBaseSchema = z.object({
  companyId: uuidSchema,
  name: requiredString("Nome"),
  type: z.enum(
    AUTOMATIC_CAMPAIGN_TYPE_VALUES as [
      AutomaticCampaignType,
      ...AutomaticCampaignType[],
    ]
  ),
  segmentation: requiredString("Segmentação"),
  startDate: requiredString("Data de início"),
  messageText: requiredString("Mensagem"),
  channel: z
    .enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]])
    .default("WHATSAPP_WEB"),
  maxDailySends: z.number().int().min(1).default(50),
  active: z.boolean().default(true),
  images: z.string().optional(),
  endDate: z.string().nullable().optional(),
  daysOfWeek: z.array(z.string()).default([]),
  sendTimeStart: z.string().nullable().optional(),
  sendTimeEnd: z.string().nullable().optional(),
  couponId: z.string().uuid().nullable().optional().or(z.literal("")),
  gifts: z.array(giftSchema).default([]),
  creatives: z.array(creativeSchema).default([]),
  status: z
    .enum(
      AUTOMATIC_CAMPAIGN_STATUS_VALUES as [
        AutomaticCampaignStatus,
        ...AutomaticCampaignStatus[],
      ]
    )
    .optional(),
})

export const createAutomaticCampaignSchema = automaticCampaignBaseSchema.extend({
  type: z.enum(
    CREATABLE_AUTOMATIC_CAMPAIGN_TYPE_VALUES as [
      AutomaticCampaignType,
      ...AutomaticCampaignType[],
    ]
  ),
})

const automaticCampaignFormFields = {
  sendScheduleMode: z
    .enum(["establishment", "fixed", "range"])
    .default("establishment"),
}

const refineAutomaticCampaignSchedule = (
  data: {
    sendScheduleMode?: "establishment" | "fixed" | "range"
    sendTimeStart?: string | null
    sendTimeEnd?: string | null
  },
  ctx: z.RefinementCtx
) => {
  if (data.sendScheduleMode === "fixed" && !data.sendTimeStart?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o horário fixo",
      path: ["sendTimeStart"],
    })
  }

  if (data.sendScheduleMode === "range") {
    if (!data.sendTimeStart?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o horário de início",
        path: ["sendTimeStart"],
      })
    }

    if (!data.sendTimeEnd?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o horário de fim",
        path: ["sendTimeEnd"],
      })
    }

    if (
      data.sendTimeStart?.trim() &&
      data.sendTimeEnd?.trim() &&
      data.sendTimeStart === data.sendTimeEnd
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O horário de fim deve ser diferente do horário de início",
        path: ["sendTimeEnd"],
      })
    }
  }
}

export const automaticCampaignFormSchema = createAutomaticCampaignSchema
  .extend(automaticCampaignFormFields)
  .superRefine(refineAutomaticCampaignSchedule)

export const automaticCampaignEditFormSchema = automaticCampaignBaseSchema
  .extend(automaticCampaignFormFields)
  .superRefine(refineAutomaticCampaignSchedule)

export type CreateAutomaticCampaignInput = z.infer<
  typeof createAutomaticCampaignSchema
>

export type AutomaticCampaignFormInput = z.infer<
  typeof automaticCampaignFormSchema
>

export type AutomaticCampaignEditFormInput = z.infer<
  typeof automaticCampaignEditFormSchema
>

export const updateAutomaticCampaignSchema = automaticCampaignBaseSchema
  .partial()
  .extend({
    status: z
      .enum(
        AUTOMATIC_CAMPAIGN_STATUS_VALUES as [
          AutomaticCampaignStatus,
          ...AutomaticCampaignStatus[],
        ]
      )
      .optional(),
    companyId: uuidSchema.optional(),
    endDate: z.string().nullable().optional(),
    couponId: z.string().uuid().nullable().optional().or(z.literal("")),
  })

export type UpdateAutomaticCampaignInput = z.infer<
  typeof updateAutomaticCampaignSchema
>

export const campaignFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().default("createdAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  companyId: z.string().optional(),
  name: z.string().trim().optional(),
  status: z.enum(CAMPAIGN_STATUS_VALUES as [CampaignStatus, ...CampaignStatus[]]).optional(),
  channel: z.enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]]).optional(),
  modifiedByAI: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  trakingCode: z.string().trim().optional(),
})

export const automaticCampaignFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().default("createdAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  companyId: z.string().optional(),
  name: z.string().trim().optional(),
  type: z
    .enum(
      AUTOMATIC_CAMPAIGN_TYPE_VALUES as [
        AutomaticCampaignType,
        ...AutomaticCampaignType[],
      ]
    )
    .optional(),
  status: z
    .enum(
      AUTOMATIC_CAMPAIGN_STATUS_VALUES as [
        AutomaticCampaignStatus,
        ...AutomaticCampaignStatus[],
      ]
    )
    .optional(),
  channel: z.enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]]).optional(),
  active: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  deleted: z.boolean().optional(),
})

export const messageFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  status: z.array(z.enum(MESSAGE_STATUS_VALUES as [MessageStatus, ...MessageStatus[]])).optional(),
  channel: z.enum(CAMPAIGN_CHANNEL_VALUES as [CampaignChannel, ...CampaignChannel[]]).optional(),
  phone: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  error: z.string().trim().optional(),
  hasSale: z.boolean().optional(),
})
