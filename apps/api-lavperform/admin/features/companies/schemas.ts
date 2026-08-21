import { z } from "zod"

import { COMPANY_STATUS_VALUES } from "./types"

const requiredString = (label: string) =>
  z
    .string({ message: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)

export const cnpjSchema = z
  .string({ message: "CNPJ é obrigatório" })
  .trim()
  .refine((value) => value.replace(/\D/g, "").length === 14, {
    message: "CNPJ deve ter 14 dígitos",
  })

export const ufSchema = z
  .string({ message: "UF é obrigatório" })
  .trim()
  .length(2, "UF deve ter 2 letras")
  .regex(/^[A-Za-z]{2}$/, "UF inválido")

export const slugSchema = z
  .string({ message: "Slug é obrigatório" })
  .trim()
  .min(1, "Slug é obrigatório")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use apenas letras minúsculas, números e hífens"
  )

export const zipCodeSchema = z
  .string({ message: "CEP é obrigatório" })
  .trim()
  .refine((value) => value.replace(/\D/g, "").length === 8, {
    message: "CEP deve ter 8 dígitos",
  })

const optionalString = z.string().optional()

export const addressSchema = z.object({
  zipCode: zipCodeSchema,
  street: requiredString("Rua"),
  number: requiredString("Número"),
  complement: optionalString,
  neighborhood: requiredString("Bairro"),
  city: requiredString("Cidade"),
  state: ufSchema,
})

export type AddressInput = z.infer<typeof addressSchema>

export const createCompanySchema = z.object({
  slug: slugSchema,
  name: requiredString("Nome"),
  cnpj: cnpjSchema,
  email: z
    .string({ message: "Email é obrigatório" })
    .trim()
    .email("Email inválido"),
  phone: optionalString,
  zipCode: zipCodeSchema,
  street: requiredString("Rua"),
  number: requiredString("Número"),
  complement: optionalString,
  neighborhood: requiredString("Bairro"),
  city: requiredString("Cidade"),
  state: ufSchema,
  businessPartnerId: optionalString,
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

export const updateCompanySchema = z.object({
  name: requiredString("Nome"),
  cnpj: cnpjSchema,
  email: z
    .string({ message: "Email é obrigatório" })
    .trim()
    .email("Email inválido"),
  phone: optionalString,
  address: addressSchema,
  showIncentivizedSales: z.boolean(),
})

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

export const companyFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().default("createdAt"),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  name: z.string().trim().optional(),
  state: z.enum(COMPANY_STATUS_VALUES as [string, ...string[]]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export type CompanyFiltersInput = z.infer<typeof companyFiltersSchema>
