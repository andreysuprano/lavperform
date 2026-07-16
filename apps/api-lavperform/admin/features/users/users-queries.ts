"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"
import { companyKeys } from "@/features/companies/companies-queries"

import {
  assignUserToCompany,
  changeUserPassword,
  createUser,
  deleteUser,
  getUser,
  listUsers,
  unassignUserFromCompany,
  updateUser,
} from "./users-api"
import type { CreateUserInput, UpdateUserInput } from "./schemas"
import type { UserListParams } from "./types"

export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    staleTime: 60_000,
  })
}

export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? userKeys.detail(id) : userKeys.detail("__none__"),
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.setQueryData(userKeys.detail(user.id), user)
      toast.success("Usuário criado com sucesso")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível criar o usuário"))
    },
  })
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(userId, input),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.setQueryData(userKeys.detail(userId), user)
      toast.success("Usuário atualizado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar o usuário")
      )
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.removeQueries({ queryKey: userKeys.detail(userId) })
      queryClient.invalidateQueries({ queryKey: companyKeys.all })
      toast.success("Usuário removido")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível remover o usuário"))
    },
  })
}

export function useChangeUserPassword(userId: string) {
  return useMutation({
    mutationFn: (newPassword: string) => changeUserPassword(userId, newPassword),
    onSuccess: () => {
      toast.success("Senha alterada")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível trocar a senha"))
    },
  })
}

export function useAssignUserToCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      companyId,
    }: {
      userId: string
      companyId: string
    }) => assignUserToCompany(userId, companyId),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: companyKeys.users(companyId),
      })
      toast.success("Usuário vinculado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível vincular o usuário")
      )
    },
  })
}

export function useUnassignUserFromCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      companyId,
    }: {
      userId: string
      companyId: string
    }) => unassignUserFromCompany(userId, companyId),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({
        queryKey: companyKeys.users(companyId),
      })
      toast.success("Usuário desvinculado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível desvincular o usuário")
      )
    },
  })
}
