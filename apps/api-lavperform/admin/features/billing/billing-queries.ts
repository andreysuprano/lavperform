"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import {
  createDefaultProduct,
  createPlan,
  deleteDefaultProduct,
  deletePlan,
  listDefaultProducts,
  listPlans,
  restoreDefaultProduct,
  toggleDefaultProductActive,
  togglePlanActive,
  updateDefaultProduct,
  updatePlan,
} from "./billing-api"
import {
  changePlan,
  createCreditProduct,
  createCreditTopup,
  createStandalonePayment,
  deleteCreditProduct,
  deletePayment,
  deleteSubscription,
  deleteTopupAsaasCharge,
  getCreditBalance,
  getSubscription,
  grantPlatformCredits,
  listCreditLedger,
  listCreditProducts,
  listCreditTopups,
  listEffectiveCreditProducts,
  listSubscriptionPayments,
  provisionSubscription,
  receivePaymentInCash,
  receiveTopupInCash,
  recoverCreditTopup,
  refundPayment,
  restoreCreditProduct,
  syncTopupFromAsaas,
  toggleCreditProductActive,
  updateCreditProduct,
  updateSubscriptionStatus,
  updateTopupStatus,
} from "./company-billing-api"
import type {
  ChangePlanInput,
  CreatePaymentInput,
  CreateTopupInput,
  GrantCreditsInput,
  CreditProductInput,
  DefaultProductInput,
  PlanInput,
  ReceiveInCashInput,
  RefundPaymentInput,
  SubscriptionStatusInput,
  UpdateTopupStatusInput,
} from "./schemas"
import type {
  CreditLedgerListParams,
  CreditProductListParams,
  CreditTopupListParams,
  DefaultProductListParams,
  PlanListParams,
} from "./types"

export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
  plansList: (params: PlanListParams) =>
    [...billingKeys.plans(), params] as const,
  defaultProducts: {
    all: () => [...billingKeys.all, "default-products"] as const,
    list: (params: DefaultProductListParams) =>
      [...billingKeys.defaultProducts.all(), params] as const,
  },
}

export const companyBillingKeys = {
  all: ["company-billing"] as const,
  company: (companyId: string) =>
    [...companyBillingKeys.all, companyId] as const,
  subscription: (companyId: string) =>
    [...companyBillingKeys.company(companyId), "subscription"] as const,
  payments: (companyId: string) =>
    [...companyBillingKeys.company(companyId), "payments"] as const,
  credits: {
    balance: (companyId: string) =>
      [...companyBillingKeys.company(companyId), "credits", "balance"] as const,
    topups: (companyId: string, params: CreditTopupListParams) =>
      [
        ...companyBillingKeys.company(companyId),
        "credits",
        "topups",
        params,
      ] as const,
    ledger: (companyId: string, params: CreditLedgerListParams) =>
      [
        ...companyBillingKeys.company(companyId),
        "credits",
        "ledger",
        params,
      ] as const,
    products: (companyId: string, params: CreditProductListParams) =>
      [
        ...companyBillingKeys.company(companyId),
        "credits",
        "products",
        params,
      ] as const,
    effectiveProducts: (companyId: string, params: CreditProductListParams) =>
      [
        ...companyBillingKeys.company(companyId),
        "credits",
        "products-effective",
        params,
      ] as const,
  },
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function invalidateCompanyBilling(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string
) {
  queryClient.invalidateQueries({
    queryKey: companyBillingKeys.company(companyId),
  })
}

function invalidatePlans(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: billingKeys.plans() })
}

export function usePlans(params: PlanListParams = {}) {
  return useQuery({
    queryKey: billingKeys.plansList(params),
    queryFn: () => listPlans(params),
  })
}

export function useAdminPlans(params: PlanListParams = { includeInactive: true }) {
  return useQuery({
    queryKey: billingKeys.plansList(params),
    queryFn: () => listPlans(params),
  })
}

export function useDefaultProducts(params: DefaultProductListParams = {}) {
  return useQuery({
    queryKey: billingKeys.defaultProducts.list(params),
    queryFn: () => listDefaultProducts(params),
  })
}

export function useCompanySubscription(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.subscription(companyId)
      : ["__none__"],
    queryFn: () => getSubscription(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useSubscriptionPayments(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.payments(companyId)
      : ["__none__"],
    queryFn: () => listSubscriptionPayments(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useCreditBalance(companyId: string | undefined) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.credits.balance(companyId)
      : ["__none__"],
    queryFn: () => getCreditBalance(companyId as string),
    enabled: Boolean(companyId),
  })
}

export function useCreditTopups(
  companyId: string | undefined,
  params: CreditTopupListParams = {}
) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.credits.topups(companyId, params)
      : ["__none__"],
    queryFn: () => listCreditTopups(companyId as string, params),
    enabled: Boolean(companyId),
  })
}

export function useCreditLedger(
  companyId: string | undefined,
  params: CreditLedgerListParams = {}
) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.credits.ledger(companyId, params)
      : ["__none__"],
    queryFn: () => listCreditLedger(companyId as string, params),
    enabled: Boolean(companyId),
  })
}

export function useCreditProducts(
  companyId: string | undefined,
  params: CreditProductListParams = {}
) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.credits.products(companyId, params)
      : ["__none__"],
    queryFn: () => listCreditProducts(companyId as string, params),
    enabled: Boolean(companyId),
  })
}

export function useEffectiveCreditProducts(
  companyId: string | undefined,
  params: CreditProductListParams = {}
) {
  return useQuery({
    queryKey: companyId
      ? companyBillingKeys.credits.effectiveProducts(companyId, params)
      : ["__none__"],
    queryFn: () => listEffectiveCreditProducts(companyId as string, params),
    enabled: Boolean(companyId),
  })
}

export function useChangePlan(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ChangePlanInput) => changePlan(companyId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      invalidatePlans(queryClient)
      toast.success("Plano atualizado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao trocar plano")),
  })
}

export function useUpdateSubscriptionStatus(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SubscriptionStatusInput) =>
      updateSubscriptionStatus(companyId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Status da assinatura atualizado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao atualizar status")),
  })
}

export function useProvisionSubscription(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body?: { planId?: string }) =>
      provisionSubscription(companyId, body),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Assinatura provisionada no Asaas")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao provisionar assinatura")),
  })
}

export function useDeleteSubscription(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteSubscription(companyId),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Assinatura removida no Asaas")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao remover assinatura")),
  })
}

export function useCreatePayment(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) =>
      createStandalonePayment(companyId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Cobrança criada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao criar cobrança")),
  })
}

export function useReceivePaymentInCash(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      paymentId,
      input,
    }: {
      paymentId: string
      input: ReceiveInCashInput
    }) => receivePaymentInCash(companyId, paymentId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Recebimento confirmado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao confirmar recebimento")),
  })
}

export function useDeletePayment(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: string) => deletePayment(companyId, paymentId),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Cobrança excluída")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao excluir cobrança")),
  })
}

export function useRefundPayment(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      paymentId,
      input,
    }: {
      paymentId: string
      input: RefundPaymentInput
    }) => refundPayment(companyId, paymentId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Estorno solicitado")
    },
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao estornar")),
  })
}

export function useCreateTopup(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTopupInput) =>
      createCreditTopup(companyId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Recarga criada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao criar recarga")),
  })
}

export function useGrantPlatformCredits(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GrantCreditsInput) =>
      grantPlatformCredits(companyId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Créditos concedidos")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao conceder créditos")),
  })
}

export function useRecoverTopup(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (asaasChargeId: string) =>
      recoverCreditTopup(companyId, asaasChargeId),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Recarga recuperada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao recuperar recarga")),
  })
}

export function useReceiveTopupInCash(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      topupId,
      input,
    }: {
      topupId: string
      input: ReceiveInCashInput
    }) => receiveTopupInCash(companyId, topupId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Recarga confirmada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao confirmar recarga")),
  })
}

export function useSyncTopup(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topupId: string) => syncTopupFromAsaas(companyId, topupId),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Recarga sincronizada com Asaas")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao sincronizar recarga")),
  })
}

export function useDeleteTopupCharge(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topupId: string) =>
      deleteTopupAsaasCharge(companyId, topupId),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Cobrança da recarga cancelada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao cancelar cobrança")),
  })
}

export function useUpdateTopupStatus(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      topupId,
      input,
    }: {
      topupId: string
      input: UpdateTopupStatusInput
    }) => updateTopupStatus(companyId, topupId, input),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Status da recarga atualizado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao atualizar status")),
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlanInput) =>
      createPlan(input as unknown as Record<string, unknown>),
    onSuccess: () => {
      invalidatePlans(queryClient)
      toast.success("Plano criado")
    },
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao criar plano")),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PlanInput> }) =>
      updatePlan(id, input as Record<string, unknown>),
    onSuccess: () => {
      invalidatePlans(queryClient)
      toast.success("Plano atualizado")
    },
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao atualizar plano")),
  })
}

export function useTogglePlanActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: togglePlanActive,
    onSuccess: () => {
      invalidatePlans(queryClient)
      toast.success("Status do plano alterado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao alterar status do plano")),
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      invalidatePlans(queryClient)
      toast.success("Plano removido")
    },
    onError: (e) => toast.error(getErrorMessage(e, "Erro ao remover plano")),
  })
}

export function useCreateDefaultProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DefaultProductInput) =>
      createDefaultProduct(input as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.defaultProducts.all(),
      })
      toast.success("Oferta default criada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao criar oferta")),
  })
}

export function useUpdateDefaultProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<DefaultProductInput>
    }) => updateDefaultProduct(id, input as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.defaultProducts.all(),
      })
      toast.success("Oferta atualizada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao atualizar oferta")),
  })
}

export function useToggleDefaultProductActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: toggleDefaultProductActive,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.defaultProducts.all(),
      })
      toast.success("Status alterado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao alterar status")),
  })
}

export function useRestoreDefaultProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: restoreDefaultProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.defaultProducts.all(),
      })
      toast.success("Oferta restaurada")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao restaurar oferta")),
  })
}

export function useDeleteDefaultProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDefaultProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: billingKeys.defaultProducts.all(),
      })
      toast.success("Oferta removida")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao remover oferta")),
  })
}

export function useCreateCreditProduct(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreditProductInput) =>
      createCreditProduct(companyId, input as unknown as Record<string, unknown>),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Produto criado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao criar produto")),
  })
}

export function useUpdateCreditProduct(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<CreditProductInput>
    }) =>
      updateCreditProduct(companyId, id, input as Record<string, unknown>),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Produto atualizado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao atualizar produto")),
  })
}

export function useToggleCreditProductActive(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleCreditProductActive(companyId, id),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Status alterado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao alterar status")),
  })
}

export function useRestoreCreditProduct(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreCreditProduct(companyId, id),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Produto restaurado")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao restaurar produto")),
  })
}

export function useDeleteCreditProduct(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCreditProduct(companyId, id),
    onSuccess: () => {
      invalidateCompanyBilling(queryClient, companyId)
      toast.success("Produto removido")
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Erro ao remover produto")),
  })
}
