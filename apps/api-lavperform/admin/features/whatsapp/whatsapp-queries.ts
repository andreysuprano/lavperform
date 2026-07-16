"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createWhatsappInstance,
  createConnectionLink,
  getCompanyWhatsappInstance,
  getGlobalWebhook,
  getGlobalWebhookErrors,
  listConnectionLinks,
  listWhatsappInstances,
  restartWhatsappApplication,
  revokeConnectionLink,
  rotateWhatsappAdminToken,
  setGlobalWebhook,
  updateInstanceAdminFields,
} from "./whatsapp-api"
import { getWhatsappConnectBaseUrl } from "./utils"
import type {
  CreateInstanceInput,
  GlobalWebhookInput,
  UpdateAdminFieldsInput,
} from "./schemas"

export const whatsappKeys = {
  all: ["whatsapp"] as const,
  instances: () => [...whatsappKeys.all, "instances"] as const,
  companyInstance: (companyId: string) =>
    [...whatsappKeys.all, "company-instance", companyId] as const,
  globalWebhook: () => [...whatsappKeys.all, "global-webhook"] as const,
  webhookErrors: () => [...whatsappKeys.all, "webhook-errors"] as const,
  connectionLinks: (companyId: string) =>
    [...whatsappKeys.all, "connection-links", companyId] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useWhatsappInstances() {
  return useQuery({
    queryKey: whatsappKeys.instances(),
    queryFn: listWhatsappInstances,
  })
}

export function useCompanyWhatsappInstance(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? whatsappKeys.companyInstance(companyId)
      : whatsappKeys.companyInstance("__none__"),
    queryFn: () => getCompanyWhatsappInstance(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useGlobalWebhook() {
  return useQuery({
    queryKey: whatsappKeys.globalWebhook(),
    queryFn: getGlobalWebhook,
  })
}

export function useGlobalWebhookErrors() {
  return useQuery({
    queryKey: whatsappKeys.webhookErrors(),
    queryFn: getGlobalWebhookErrors,
  })
}

function invalidateInstances(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: whatsappKeys.instances() })
  queryClient.invalidateQueries({
    queryKey: whatsappKeys.all,
    predicate: (query) =>
      Array.isArray(query.queryKey) &&
      query.queryKey.includes("company-instance"),
  })
}

export function useCreateWhatsappInstance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInstanceInput) => createWhatsappInstance(input),
    onSuccess: (result) => {
      invalidateInstances(queryClient)
      toast.success(result.info || "Instância criada com sucesso")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível criar a instância")
      )
    },
  })
}

export function useUpdateInstanceAdminFields(instanceToken: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAdminFieldsInput) =>
      updateInstanceAdminFields(instanceToken, input),
    onSuccess: () => {
      invalidateInstances(queryClient)
      toast.success("Campos administrativos atualizados")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar os campos")
      )
    },
  })
}

export function useSetGlobalWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GlobalWebhookInput) => setGlobalWebhook(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.globalWebhook() })
      toast.success("Webhook global atualizado")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível configurar o webhook")
      )
    },
  })
}

export function useRestartWhatsappApplication() {
  return useMutation({
    mutationFn: restartWhatsappApplication,
    onSuccess: (result) => {
      toast.success(result.message || "Restart iniciado")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível reiniciar o servidor"))
    },
  })
}

export function useRotateWhatsappAdminToken() {
  return useMutation({
    mutationFn: rotateWhatsappAdminToken,
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível rotacionar o token"))
    },
  })
}

export function useConnectionLinks(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? whatsappKeys.connectionLinks(companyId)
      : whatsappKeys.connectionLinks("__none__"),
    queryFn: () => listConnectionLinks(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useCreateConnectionLink(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      createConnectionLink({
        companyId,
        publicBaseUrl: getWhatsappConnectBaseUrl(),
      }),
    onSuccess: (link) => {
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.connectionLinks(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.companyInstance(companyId),
      })
      invalidateInstances(queryClient)
      toast.success("Link de conexão gerado", {
        description: "Envie o link para o cliente conectar o WhatsApp.",
      })
      return link
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível gerar o link de conexão")
      )
    },
  })
}

export function useRevokeConnectionLink(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (linkId: string) => revokeConnectionLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: whatsappKeys.connectionLinks(companyId),
      })
      toast.success("Link revogado")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível revogar o link"))
    },
  })
}
