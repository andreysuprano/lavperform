"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createCompanyIntegration,
  deleteCompanyIntegration,
  getCompanyIntegration,
  importIntegrationHistory,
  listCompanyIntegrations,
  listIntegrationPartners,
  toggleIntegrationActive,
  updateCompanyIntegration,
} from "./integrations-api"
import type { ImportHistoryInput } from "./schemas"

export const integrationKeys = {
  all: ["integrations"] as const,
  partners: () => [...integrationKeys.all, "partners"] as const,
  companyLists: () => [...integrationKeys.all, "company-list"] as const,
  companyList: (companyId: string, revealSecrets?: boolean) =>
    [...integrationKeys.companyLists(), companyId, { revealSecrets }] as const,
  companyDetails: () => [...integrationKeys.all, "company-detail"] as const,
  companyDetail: (
    companyId: string,
    integrationId: string,
    revealSecrets?: boolean
  ) =>
    [
      ...integrationKeys.companyDetails(),
      companyId,
      integrationId,
      { revealSecrets },
    ] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useIntegrationPartners() {
  return useQuery({
    queryKey: integrationKeys.partners(),
    queryFn: listIntegrationPartners,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCompanyIntegrations(
  companyId: string | undefined,
  revealSecrets = false
) {
  return useQuery({
    queryKey: companyId
      ? integrationKeys.companyList(companyId, revealSecrets)
      : integrationKeys.companyList("__none__"),
    queryFn: () => listCompanyIntegrations(companyId as string, revealSecrets),
    enabled: Boolean(companyId),
  })
}

export function useCompanyIntegration(
  companyId: string | undefined,
  integrationId: string | undefined,
  revealSecrets = false
) {
  return useQuery({
    queryKey:
      companyId && integrationId
        ? integrationKeys.companyDetail(companyId, integrationId, revealSecrets)
        : integrationKeys.companyDetail("__none__", "__none__"),
    queryFn: () =>
      getCompanyIntegration(companyId as string, integrationId as string, revealSecrets),
    enabled: Boolean(companyId && integrationId),
  })
}

function invalidateCompanyIntegrations(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string
) {
  queryClient.invalidateQueries({
    queryKey: integrationKeys.companyLists(),
    predicate: (query) =>
      Array.isArray(query.queryKey) && query.queryKey.includes(companyId),
  })
}

export function useCreateCompanyIntegration(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createCompanyIntegration(companyId, body),
    onSuccess: () => {
      invalidateCompanyIntegrations(queryClient, companyId)
      toast.success("Integração salva com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível salvar a integração")
      )
    },
  })
}

export function useUpdateCompanyIntegration(
  companyId: string,
  integrationId: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updateCompanyIntegration(companyId, integrationId, body),
    onSuccess: () => {
      invalidateCompanyIntegrations(queryClient, companyId)
      queryClient.invalidateQueries({
        queryKey: integrationKeys.companyDetail(companyId, integrationId),
      })
      toast.success("Integração atualizada")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar a integração")
      )
    },
  })
}

export function useToggleIntegrationActive(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      integrationId,
      active,
    }: {
      integrationId: string
      active: boolean
    }) => toggleIntegrationActive(companyId, integrationId, active),
    onSuccess: () => {
      invalidateCompanyIntegrations(queryClient, companyId)
      toast.success("Status da integração atualizado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível alterar o status")
      )
    },
  })
}

export function useDeleteCompanyIntegration(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (integrationId: string) =>
      deleteCompanyIntegration(companyId, integrationId),
    onSuccess: (_, integrationId) => {
      invalidateCompanyIntegrations(queryClient, companyId)
      queryClient.removeQueries({
        queryKey: integrationKeys.companyDetail(companyId, integrationId),
      })
      toast.success("Integração removida")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível remover a integração")
      )
    },
  })
}

export function useImportIntegrationHistory(
  companyId: string,
  integrationId: string
) {
  return useMutation({
    mutationFn: (body: ImportHistoryInput) =>
      importIntegrationHistory(companyId, integrationId, body),
    onSuccess: (result) => {
      toast.success(result.message, {
        description: `${result.jobsCreated} jobs criados (${result.startDate} → ${result.endDate})`,
      })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível iniciar a importação")
      )
    },
  })
}
