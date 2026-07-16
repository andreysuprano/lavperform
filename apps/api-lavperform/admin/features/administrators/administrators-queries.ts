"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  changeAdministratorPassword,
  createAdministrator,
  getAdministrator,
  listAdministrators,
  updateAdministrator,
} from "./administrators-api"
import type {
  ChangeAdministratorPasswordInput,
  CreateAdministratorInput,
  UpdateAdministratorInput,
} from "./schemas"
import type { AdministratorListParams } from "./types"

export const administratorKeys = {
  all: ["administrators"] as const,
  lists: () => [...administratorKeys.all, "list"] as const,
  list: (params: AdministratorListParams) =>
    [...administratorKeys.lists(), params] as const,
  details: () => [...administratorKeys.all, "detail"] as const,
  detail: (id: string) => [...administratorKeys.details(), id] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useAdministrators(params: AdministratorListParams) {
  return useQuery({
    queryKey: administratorKeys.list(params),
    queryFn: () => listAdministrators(params),
  })
}

export function useAdministrator(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? administratorKeys.detail(id)
      : administratorKeys.detail("__none__"),
    queryFn: () => getAdministrator(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateAdministrator() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAdministratorInput) => createAdministrator(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: administratorKeys.lists() })
      toast.success("Administrador criado com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível criar o administrador")
      )
    },
  })
}

export function useUpdateAdministrator(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAdministratorInput) =>
      updateAdministrator(id, input),
    onSuccess: (admin) => {
      queryClient.invalidateQueries({ queryKey: administratorKeys.lists() })
      queryClient.setQueryData(administratorKeys.detail(id), admin)
      toast.success("Administrador atualizado com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar o administrador")
      )
    },
  })
}

export function useChangeAdministratorPassword(id: string) {
  return useMutation({
    mutationFn: (input: ChangeAdministratorPasswordInput) =>
      changeAdministratorPassword(id, input),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível alterar a senha"))
    },
  })
}
