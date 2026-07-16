"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ApiClientError } from "@/services/api-client"
import { useCompany } from "@/features/companies/companies-queries"

import { useCompanySubscription } from "../billing-queries"
import { AssignPlanCard } from "./subscription/assign-plan-card"
import { SubscriptionOverviewCard } from "./subscription/subscription-overview-card"
import { SubscriptionPaymentsTable } from "./subscription/subscription-payments-table"
import { CreditsBalanceCard } from "./credits/credits-balance-card"
import { CreditTopupsTable } from "./credits/credit-topups-table"
import { CreditLedgerTable } from "./credits/credit-ledger-table"
import { CreditProductsTable } from "./credits/credit-products-table"

function SubscriptionUnavailable({
  companyId,
  isNotFound,
  message,
}: {
  companyId: string
  isNotFound: boolean
  message: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card p-8">
        <p className="font-medium">
          {isNotFound ? "Assinatura não encontrada" : "Erro ao carregar assinatura"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {isNotFound && (
          <p className="mt-4 text-sm text-muted-foreground">
            Vincule um plano abaixo ou use a aba Créditos normalmente.
          </p>
        )}
      </div>
      {isNotFound && <AssignPlanCard companyId={companyId} />}
    </div>
  )
}

export function CompanyBillingView({ companyId }: { companyId: string }) {
  const companyQuery = useCompany(companyId)
  const subscriptionQuery = useCompanySubscription(companyId)

  if (companyQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const subscriptionError = subscriptionQuery.error
  const subscriptionNotFound =
    subscriptionError instanceof ApiClientError &&
    subscriptionError.statusCode === 404
  const subscription = subscriptionQuery.data

  return (
    <div className="flex flex-col gap-6">
      <BillingHeader
        companyName={companyQuery.data?.name ?? companyId}
        companyId={companyId}
      />

      <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Operações Asaas de assinatura não são sincronizadas automaticamente via
        webhook de créditos. Use sync manual nas recargas quando necessário.
      </p>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="payments">Cobranças</TabsTrigger>
          <TabsTrigger value="credits">Créditos</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="mt-4">
          {subscriptionQuery.isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          ) : subscriptionError ? (
            <SubscriptionUnavailable
              companyId={companyId}
              isNotFound={subscriptionNotFound}
              message={subscriptionError.message}
            />
          ) : subscription ? (
            <SubscriptionOverviewCard companyId={companyId} data={subscription} />
          ) : null}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          {subscriptionQuery.isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          ) : subscriptionError ? (
            <SubscriptionUnavailable
              companyId={companyId}
              isNotFound={subscriptionNotFound}
              message={subscriptionError.message}
            />
          ) : (
            <SubscriptionPaymentsTable companyId={companyId} />
          )}
        </TabsContent>

        <TabsContent value="credits" className="mt-4 flex flex-col gap-6">
          <CreditsBalanceCard companyId={companyId} />
          <div>
            <h3 className="mb-3 text-sm font-medium">Recargas</h3>
            <CreditTopupsTable companyId={companyId} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Extrato</h3>
            <CreditLedgerTable companyId={companyId} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Produtos da empresa</h3>
            <CreditProductsTable companyId={companyId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BillingHeader({
  companyName,
  companyId,
}: {
  companyName?: string
  companyId: string
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          nativeButton={false}
          render={<Link href={`/companies/${companyId}`} />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Faturamento</h1>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
      </div>
    </div>
  )
}
