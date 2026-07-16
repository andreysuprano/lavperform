import { z } from "zod"

const requiredString = (label: string) =>
  z
    .string({ message: `${label} é obrigatório` })
    .trim()
    .min(1, `${label} é obrigatório`)

export const createUserSchema = z.object({
  name: requiredString("Nome"),
  email: z
    .string({ message: "Email é obrigatório" })
    .trim()
    .email("Email inválido"),
  phone: requiredString("Telefone"),
  password: z
    .string({ message: "Senha é obrigatória" })
    .min(6, "A senha deve ter ao menos 6 caracteres"),
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  name: requiredString("Nome"),
  email: z
    .string({ message: "Email é obrigatório" })
    .trim()
    .email("Email inválido"),
  phone: requiredString("Telefone"),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string({ message: "Senha é obrigatória" })
      .min(6, "A senha deve ter ao menos 6 caracteres"),
    confirmPassword: z
      .string({ message: "Confirme a senha" })
      .min(1, "Confirme a senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
