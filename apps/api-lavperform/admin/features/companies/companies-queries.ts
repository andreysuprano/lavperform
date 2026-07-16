"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  listCompanyUsers,
  reprocessCompanyRfv,
  updateCompany,
  updateCompanyState,
  validateCompanyWhatsapp,
} from "./companies-api"
import type { CreateCompanyInput, UpdateCompanyInput } from "./schemas"
import type { CompanyListParams, CompanyStatus } from "./types"

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  list: (params: CompanyListParams) =>
    [...companyKeys.lists(), params] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
  users: (id: string) => [...companyKeys.detail(id), "users"] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: companyKeys.list(params),
    queryFn: () => listCompanies(params),
  })
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: id ? companyKeys.detail(id) : companyKeys.detail("__none__"),
    queryFn: () => getCompany(id as string),
    enabled: Boolean(id),
  })
}

export function useCompanyUsers(id: string | undefined) {
  return useQuery({
    queryKey: id ? companyKeys.users(id) : companyKeys.users("__none__"),
    queryFn: () => listCompanyUsers(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      queryClient.setQueryData(companyKeys.detail(company.id), company)
      toast.success("Empresa criada com sucesso")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível criar a empresa"))
    },
  })
}

export function useUpdateCompany(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => updateCompany(id, input),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      queryClient.setQueryData(companyKeys.detail(id), company)
      toast.success("Empresa atualizada com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar a empresa")
      )
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCompany(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      queryClient.removeQueries({ queryKey: companyKeys.detail(id) })
      toast.success("Empresa removida")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível remover a empresa"))
    },
  })
}

export function useUpdateCompanyState() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: CompanyStatus }) =>
      updateCompanyState(id, state),
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() })
      queryClient.setQueryData(companyKeys.detail(company.id), company)
      toast.success("Status atualizado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível alterar o status da empresa")
      )
    },
  })
}

export function useValidateCompanyWhatsapp() {
  return useMutation({
    mutationFn: (id: string) => validateCompanyWhatsapp(id),
    onSuccess: (result) => {
      toast.success("Validação de WhatsApp enfileirada", {
        description: `${result.totalEnqueued} cliente(s) enviado(s) para a fila.`,
      })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          "Não foi possível enfileirar a validação de WhatsApp"
        )
      )
    },
  })
}

export function useReprocessCompanyRfv() {
  return useMutation({
    mutationFn: (id: string) => reprocessCompanyRfv(id),
    onSuccess: () => {
      toast.success("Reprocessamento RFV enfileirado", {
        description:
          "A análise RFV de todos os clientes da empresa foi enviada para a fila.",
      })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          "Não foi possível enfileirar o reprocessamento RFV"
        )
      )
    },
  })
}
