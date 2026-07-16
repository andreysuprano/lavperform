"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createCompanyApiKey,
  deleteCompanyApiKey,
  listCompanyApiKeys,
  revokeCompanyApiKey,
} from "./api-keys-api"
import type { CreatePublicApiKeyInput } from "./types"

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  companyLists: () => [...apiKeyKeys.all, "company-list"] as const,
  companyList: (companyId: string) =>
    [...apiKeyKeys.companyLists(), companyId] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useCompanyApiKeys(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? apiKeyKeys.companyList(companyId)
      : apiKeyKeys.companyList("__none__"),
    queryFn: () => listCompanyApiKeys(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useCreateCompanyApiKey(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePublicApiKeyInput) =>
      createCompanyApiKey(companyId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.companyList(companyId),
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível criar a API key"))
    },
  })
}

export function useRevokeCompanyApiKey(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (apiKeyId: string) => revokeCompanyApiKey(companyId, apiKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.companyList(companyId),
      })
      toast.success("API key revogada")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível revogar a API key"))
    },
  })
}

export function useDeleteCompanyApiKey(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (apiKeyId: string) => deleteCompanyApiKey(companyId, apiKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.companyList(companyId),
      })
      toast.success("API key removida")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível remover a API key"))
    },
  })
}
