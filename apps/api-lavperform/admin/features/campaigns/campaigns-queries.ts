"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createAutomaticCampaign,
  createCampaign,
  deleteAutomaticCampaign,
  deleteCampaign,
  getAutomaticCampaign,
  getCampaign,
  listAutomaticCampaignMessages,
  listAutomaticCampaigns,
  listCampaignMessages,
  listCampaigns,
  reprocessAutomaticCampaign,
  reprocessCampaign,
  restoreAutomaticCampaign,
  toggleAutomaticCampaignActive,
  updateAutomaticCampaign,
  updateAutomaticCampaignStatus,
  updateCampaign,
  updateCampaignStatus,
} from "./campaigns-api"
import type {
  CreateAutomaticCampaignInput,
  CreateCampaignInput,
  UpdateAutomaticCampaignInput,
  UpdateCampaignInput,
} from "./schemas"
import type {
  AutomaticCampaignListParams,
  AutomaticCampaignStatus,
  CampaignListParams,
  CampaignStatus,
  MessageListParams,
} from "./types"

export const campaignKeys = {
  all: ["campaigns"] as const,
  scheduled: {
    all: () => [...campaignKeys.all, "scheduled"] as const,
    lists: () => [...campaignKeys.scheduled.all(), "list"] as const,
    list: (params: CampaignListParams) =>
      [...campaignKeys.scheduled.lists(), params] as const,
    details: () => [...campaignKeys.scheduled.all(), "detail"] as const,
    detail: (id: string) => [...campaignKeys.scheduled.details(), id] as const,
    messages: (id: string, params: MessageListParams) =>
      [...campaignKeys.scheduled.detail(id), "messages", params] as const,
  },
  automatic: {
    all: () => [...campaignKeys.all, "automatic"] as const,
    lists: () => [...campaignKeys.automatic.all(), "list"] as const,
    list: (params: AutomaticCampaignListParams) =>
      [...campaignKeys.automatic.lists(), params] as const,
    details: () => [...campaignKeys.automatic.all(), "detail"] as const,
    detail: (id: string) =>
      [...campaignKeys.automatic.details(), id] as const,
    messages: (id: string, params: MessageListParams) =>
      [...campaignKeys.automatic.detail(id), "messages", params] as const,
  },
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

// --- Scheduled queries ---

export function useCampaigns(params: CampaignListParams) {
  return useQuery({
    queryKey: campaignKeys.scheduled.list(params),
    queryFn: () => listCampaigns(params),
  })
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? campaignKeys.scheduled.detail(id)
      : campaignKeys.scheduled.detail("__none__"),
    queryFn: () => getCampaign(id as string),
    enabled: Boolean(id),
  })
}

export function useCampaignMessages(
  id: string | undefined,
  params: MessageListParams
) {
  return useQuery({
    queryKey: id
      ? campaignKeys.scheduled.messages(id, params)
      : campaignKeys.scheduled.messages("__none__", params),
    queryFn: () => listCampaignMessages(id as string, params),
    enabled: Boolean(id),
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => createCampaign(input),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduled.lists() })
      queryClient.setQueryData(
        campaignKeys.scheduled.detail(campaign.id),
        campaign
      )
      toast.success("Campanha criada com sucesso")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível criar a campanha"))
    },
  })
}

export function useUpdateCampaign(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => updateCampaign(id, input),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduled.lists() })
      queryClient.setQueryData(campaignKeys.scheduled.detail(id), campaign)
      toast.success("Campanha atualizada com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar a campanha")
      )
    },
  })
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      updateCampaignStatus(id, status),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduled.lists() })
      queryClient.setQueryData(
        campaignKeys.scheduled.detail(campaign.id),
        campaign
      )
      toast.success("Status atualizado")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível alterar o status"))
    },
  })
}

export function useReprocessCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reprocessCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduled.lists() })
      queryClient.invalidateQueries({
        queryKey: campaignKeys.scheduled.detail(id),
      })
      toast.success("Campanha enviada para reprocessamento")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível reprocessar"))
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.scheduled.lists() })
      queryClient.removeQueries({ queryKey: campaignKeys.scheduled.detail(id) })
      toast.success("Campanha removida")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível remover a campanha"))
    },
  })
}

// --- Automatic queries ---

export function useAutomaticCampaigns(params: AutomaticCampaignListParams) {
  return useQuery({
    queryKey: campaignKeys.automatic.list(params),
    queryFn: () => listAutomaticCampaigns(params),
  })
}

export function useAutomaticCampaign(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? campaignKeys.automatic.detail(id)
      : campaignKeys.automatic.detail("__none__"),
    queryFn: () => getAutomaticCampaign(id as string),
    enabled: Boolean(id),
  })
}

export function useAutomaticCampaignMessages(
  id: string | undefined,
  params: MessageListParams
) {
  return useQuery({
    queryKey: id
      ? campaignKeys.automatic.messages(id, params)
      : campaignKeys.automatic.messages("__none__", params),
    queryFn: () => listAutomaticCampaignMessages(id as string, params),
    enabled: Boolean(id),
  })
}

export function useCreateAutomaticCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAutomaticCampaignInput) =>
      createAutomaticCampaign(input),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(
        campaignKeys.automatic.detail(campaign.id),
        campaign
      )
      toast.success("Campanha automática criada com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível criar a campanha automática")
      )
    },
  })
}

export function useUpdateAutomaticCampaign(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAutomaticCampaignInput) =>
      updateAutomaticCampaign(id, input),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(campaignKeys.automatic.detail(id), campaign)
      toast.success("Campanha automática atualizada com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          "Não foi possível atualizar a campanha automática"
        )
      )
    },
  })
}

export function useUpdateAutomaticCampaignStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: AutomaticCampaignStatus
    }) => updateAutomaticCampaignStatus(id, status),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(
        campaignKeys.automatic.detail(campaign.id),
        campaign
      )
      toast.success("Status atualizado")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível alterar o status"))
    },
  })
}

export function useToggleAutomaticCampaignActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleAutomaticCampaignActive(id),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(
        campaignKeys.automatic.detail(campaign.id),
        campaign
      )
      toast.success(
        campaign.active ? "Campanha ativada" : "Campanha desativada"
      )
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível alterar o status"))
    },
  })
}

export function useReprocessAutomaticCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reprocessAutomaticCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.invalidateQueries({
        queryKey: campaignKeys.automatic.detail(id),
      })
      toast.success("Campanha enviada para reprocessamento")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível reprocessar"))
    },
  })
}

export function useDeleteAutomaticCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAutomaticCampaign(id),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(
        campaignKeys.automatic.detail(campaign.id),
        campaign
      )
      toast.success("Campanha movida para a lixeira")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível excluir a campanha"))
    },
  })
}

export function useRestoreAutomaticCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreAutomaticCampaign(id),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.automatic.lists() })
      queryClient.setQueryData(
        campaignKeys.automatic.detail(campaign.id),
        campaign
      )
      toast.success("Campanha restaurada")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível restaurar a campanha"))
    },
  })
}
