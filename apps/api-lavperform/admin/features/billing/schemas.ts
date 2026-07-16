import { z } from "zod"

export const planSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  description: z.string().trim().min(1, "Descrição é obrigatória"),
  price: z.number().min(0, "Preço deve ser zero ou maior"),
  cycle: z.enum(["MONTHLY", "YEARLY", "SEMIANNUALLY", "QUARTERLY"]),
  recommended: z.boolean().optional(),
  maxPayments: z.number().int().min(0).optional(),
  endDate: z.string().optional(),
  active: z.boolean().optional(),
  allowBoleto: z.boolean().optional(),
  allowPix: z.boolean().optional(),
})

export const assignPlanSchema = z.object({
  planId: z.string().uuid("Selecione um plano"),
})

export const changePlanSchema = z.object({
  planId: z.string().uuid("Selecione um plano"),
  value: z.number().min(0).optional(),
  cycle: z.string().optional(),
  billingType: z.string().optional(),
  updatePendingPayments: z.boolean().optional(),
})

export const subscriptionStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
    nextDueDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "ACTIVE" && !data.nextDueDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data do próximo vencimento é obrigatória ao reativar",
        path: ["nextDueDate"],
      })
    }
  })

export const createPaymentSchema = z.object({
  billingType: z.string().min(1, "Forma de pagamento é obrigatória"),
  value: z.number().min(0.01, "Valor deve ser maior que zero"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  description: z.string().optional(),
})

export const receiveInCashSchema = z.object({
  paymentDate: z.string().min(1, "Data do pagamento é obrigatória"),
  value: z.number().min(0.01, "Valor deve ser maior que zero"),
  notifyCustomer: z.boolean().optional(),
})

export const refundPaymentSchema = z.object({
  value: z.number().min(0.01).optional(),
  description: z.string().optional(),
})

export const createTopupSchema = z.object({
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD"]),
  amountCents: z.number().int().min(1, "Valor mínimo de 1 centavo"),
})

export const addCreditsFormSchema = z.object({
  paymentMethod: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "PLATFORM"]),
  amountCents: z.number().int().min(1, "Valor mínimo de 1 centavo"),
  reason: z
    .string()
    .trim()
    .max(500, "Motivo deve ter no máximo 500 caracteres")
    .optional(),
})

export const grantCreditsSchema = z.object({
  amountCents: z.number().int().min(1, "Valor mínimo de 1 centavo"),
  reason: z.string().trim().max(500, "Motivo deve ter no máximo 500 caracteres").optional(),
})

export const recoverTopupSchema = z.object({
  asaasChargeId: z.string().min(1, "ID da cobrança Asaas é obrigatório"),
})

export const defaultProductSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  code: z
    .string()
    .trim()
    .min(1, "Código é obrigatório")
    .regex(/^[A-Z0-9_]+$/, "Use letras maiúsculas, números e underscore"),
  description: z.string().optional(),
  priceCents: z.number().int().min(1, "Preço deve ser pelo menos 1 centavo"),
  active: z.boolean().optional(),
})

export const creditProductSchema = defaultProductSchema

export const updateTopupStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "FAILED", "CANCELED", "EXPIRED"]),
  paidAt: z.string().optional(),
})

export type ChangePlanInput = z.infer<typeof changePlanSchema>
export type AssignPlanInput = z.infer<typeof assignPlanSchema>
export type PlanInput = z.infer<typeof planSchema>
export type SubscriptionStatusInput = z.infer<typeof subscriptionStatusSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type ReceiveInCashInput = z.infer<typeof receiveInCashSchema>
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>
export type CreateTopupInput = z.infer<typeof createTopupSchema>
export type AddCreditsFormInput = z.infer<typeof addCreditsFormSchema>
export type GrantCreditsInput = z.infer<typeof grantCreditsSchema>
export type RecoverTopupInput = z.infer<typeof recoverTopupSchema>
export type DefaultProductInput = z.infer<typeof defaultProductSchema>
export type CreditProductInput = z.infer<typeof creditProductSchema>
export type UpdateTopupStatusInput = z.infer<typeof updateTopupStatusSchema>
