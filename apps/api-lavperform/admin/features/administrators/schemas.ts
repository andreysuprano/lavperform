import { z } from "zod"

import { ADMIN_PANEL_ROLES } from "./roles"

const requiredString = (label: string) =>
  z
    .string({ message: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)

const adminRoleSchema = z.enum(ADMIN_PANEL_ROLES)

export const createAdministratorSchema = z.object({
  name: requiredString("Nome"),
  email: z
    .string({ message: "E-mail é obrigatório" })
    .trim()
    .email("E-mail inválido"),
  password: z
    .string({ message: "Senha é obrigatória" })
    .min(8, "Senha deve ter no mínimo 8 caracteres"),
  role: adminRoleSchema,
})

export const updateAdministratorSchema = z.object({
  name: requiredString("Nome"),
  email: z
    .string({ message: "E-mail é obrigatório" })
    .trim()
    .email("E-mail inválido"),
  isActive: z.boolean(),
  role: adminRoleSchema,
})

export const changeAdministratorPasswordSchema = z.object({
  newPassword: z
    .string({ message: "Senha é obrigatória" })
    .min(8, "Senha deve ter no mínimo 8 caracteres"),
})

export type CreateAdministratorInput = z.infer<typeof createAdministratorSchema>
export type UpdateAdministratorInput = z.infer<typeof updateAdministratorSchema>
export type ChangeAdministratorPasswordInput = z.infer<
  typeof changeAdministratorPasswordSchema
>
