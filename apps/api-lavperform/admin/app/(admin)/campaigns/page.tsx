"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { AutomaticCampaignsFilters } from "@/features/campaigns/components/automatic/automatic-campaigns-filters"
import { AutomaticCampaignsTable } from "@/features/campaigns/components/automatic/automatic-campaigns-table"
import { DeleteAutomaticCampaignDialog } from "@/features/campaigns/components/delete-automatic-campaign-dialog"
import { DeleteCampaignDialog } from "@/features/campaigns/components/delete-campaign-dialog"
import { ReprocessCampaignDialog } from "@/features/campaigns/components/reprocess-campaign-dialog"
import { CampaignsFilters } from "@/features/campaigns/components/scheduled/campaigns-filters"
import { CampaignsTable } from "@/features/campaigns/components/scheduled/campaigns-table"
import {
  useAutomaticCampaigns,
  useDeleteAutomaticCampaign,
  useDeleteCampaign,
  useCampaigns,
  useReprocessAutomaticCampaign,
  useReprocessCampaign,
  useRestoreAutomaticCampaign,
  useToggleAutomaticCampaignActive,
  useUpdateAutomaticCampaignStatus,
  useUpdateCampaignStatus,
} from "@/features/campaigns/campaigns-queries"
import { CampaignsListMetricsSummary } from "@/features/campaigns/components/campaigns-list-metrics-summary"
import { aggregateCampaignMetrics } from "@/features/campaigns/utils"
import type {
  AutomaticCampaign,
  AutomaticCampaignListParams,
  AutomaticCampaignStatus,
  AutomaticCampaignType,
  Campaign,
  CampaignChannel,
  CampaignListParams,
  CampaignStatus,
  CampaignTab,
} from "@/features/campaigns/types"
import {
  AUTOMATIC_CAMPAIGN_STATUS_VALUES,
  AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  CAMPAIGN_CHANNEL_VALUES,
  CAMPAIGN_STATUS_VALUES,
} from "@/features/campaigns/types"

type ScheduledFilters = Pick<
  CampaignListParams,
  | "companyId"
  | "name"
  | "status"
  | "channel"
  | "modifiedByAI"
  | "startDate"
  | "endDate"
  | "trakingCode"
>

type AutomaticFilters = Pick<
  AutomaticCampaignListParams,
  | "companyId"
  | "name"
  | "type"
  | "status"
  | "channel"
  | "active"
  | "startDate"
  | "endDate"
  | "deleted"
>

function parseTab(searchParams: URLSearchParams): CampaignTab {
  const tab = searchParams.get("tab")
  return tab === "automatic" ? "automatic" : "scheduled"
}

function parseScheduledParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")
  const orderBy = searchParams.get("orderBy") ?? "createdAt"
  const orderDirection: "asc" | "desc" =
    searchParams.get("orderDirection") === "asc" ? "asc" : "desc"
  const name = searchParams.get("name") ?? undefined
  const companyId = searchParams.get("companyId") ?? undefined
  const statusParam = searchParams.get("status")
  const status =
    statusParam && (CAMPAIGN_STATUS_VALUES as string[]).includes(statusParam)
      ? (statusParam as CampaignStatus)
      : undefined
  const channelParam = searchParams.get("channel")
  const channel =
    channelParam && (CAMPAIGN_CHANNEL_VALUES as string[]).includes(channelParam)
      ? (channelParam as CampaignChannel)
      : undefined
  const modifiedByAIParam = searchParams.get("modifiedByAI")
  const modifiedByAI =
    modifiedByAIParam === "true"
      ? true
      : modifiedByAIParam === "false"
        ? false
        : undefined
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined
  const trakingCode = searchParams.get("trakingCode") ?? undefined

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    orderBy,
    orderDirection,
    name,
    companyId,
    status,
    channel,
    modifiedByAI,
    startDate,
    endDate,
    trakingCode,
  }
}

function parseAutomaticParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")
  const orderBy = searchParams.get("orderBy") ?? "createdAt"
  const orderDirection: "asc" | "desc" =
    searchParams.get("orderDirection") === "asc" ? "asc" : "desc"
  const name = searchParams.get("name") ?? undefined
  const companyId = searchParams.get("companyId") ?? undefined
  const typeParam = searchParams.get("type")
  const type =
    typeParam &&
    (AUTOMATIC_CAMPAIGN_TYPE_VALUES as string[]).includes(typeParam)
      ? (typeParam as AutomaticCampaignType)
      : undefined
  const statusParam = searchParams.get("status")
  const status =
    statusParam &&
    (AUTOMATIC_CAMPAIGN_STATUS_VALUES as string[]).includes(statusParam)
      ? (statusParam as AutomaticCampaignStatus)
      : undefined
  const channelParam = searchParams.get("channel")
  const channel =
    channelParam && (CAMPAIGN_CHANNEL_VALUES as string[]).includes(channelParam)
      ? (channelParam as CampaignChannel)
      : undefined
  const activeParam = searchParams.get("active")
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined
  const deleted = searchParams.get("deleted") === "true" ? true : undefined

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    orderBy,
    orderDirection,
    name,
    companyId,
    type,
    status,
    channel,
    active,
    startDate,
    endDate,
    deleted,
  }
}

export default function CampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tab = useMemo(() => parseTab(searchParams), [searchParams])
  const scheduledParams = useMemo(
    () => parseScheduledParams(searchParams),
    [searchParams]
  )
  const automaticParams = useMemo(
    () => parseAutomaticParams(searchParams),
    [searchParams]
  )

  const scheduledQuery = useCampaigns(scheduledParams)
  const automaticQuery = useAutomaticCampaigns(automaticParams)

  const scheduledMetrics = useMemo(
    () => aggregateCampaignMetrics(scheduledQuery.data?.data ?? []),
    [scheduledQuery.data?.data]
  )
  const automaticMetrics = useMemo(
    () => aggregateCampaignMetrics(automaticQuery.data?.data ?? []),
    [automaticQuery.data?.data]
  )

  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [campaignToReprocess, setCampaignToReprocess] = useState<Campaign | null>(
    null
  )
  const [automaticToDelete, setAutomaticToDelete] =
    useState<AutomaticCampaign | null>(null)
  const [automaticToReprocess, setAutomaticToReprocess] =
    useState<AutomaticCampaign | null>(null)

  const deleteCampaignMutation = useDeleteCampaign()
  const reprocessCampaignMutation = useReprocessCampaign()
  const statusCampaignMutation = useUpdateCampaignStatus()

  const deleteAutomaticMutation = useDeleteAutomaticCampaign()
  const reprocessAutomaticMutation = useReprocessAutomaticCampaign()
  const statusAutomaticMutation = useUpdateAutomaticCampaignStatus()
  const toggleAutomaticMutation = useToggleAutomaticCampaignActive()
  const restoreAutomaticMutation = useRestoreAutomaticCampaign()

  const setQuery = useCallback(
    (next: Record<string, unknown>) => {
      const url = new URLSearchParams(searchParams.toString())
      const tabValue = (next.tab as CampaignTab | undefined) ?? tab
      url.set("tab", tabValue)

      const currentParams =
        tabValue === "automatic" ? automaticParams : scheduledParams
      const merged: Record<string, unknown> = { ...currentParams, ...next }
      delete merged.tab

      Object.entries(merged).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          url.delete(key)
        } else {
          url.set(key, String(value))
        }
      })

      const qs = url.toString()
      router.replace(`/campaigns?${qs}`, { scroll: false })
    },
    [automaticParams, router, scheduledParams, searchParams, tab]
  )

  const handleTabChange = useCallback(
    (value: string) => {
      const nextTab = value === "automatic" ? "automatic" : "scheduled"
      router.replace(`/campaigns?tab=${nextTab}`, { scroll: false })
    },
    [router]
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Campanhas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie campanhas agendadas e automáticas de todas as empresas.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link
              href={
                tab === "automatic"
                  ? "/campaigns/automatic/new"
                  : "/campaigns/new"
              }
            />
          }
        >
          <PlusIcon />
          {tab === "automatic"
            ? "Nova campanha automática"
            : "Nova campanha agendada"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="automatic">Automáticas</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="flex flex-col gap-4">
          <CampaignsListMetricsSummary
            metrics={scheduledMetrics}
            isLoading={scheduledQuery.isLoading}
          />

          <CampaignsFilters
            values={{
              companyId: scheduledParams.companyId,
              name: scheduledParams.name,
              status: scheduledParams.status,
              channel: scheduledParams.channel,
              modifiedByAI: scheduledParams.modifiedByAI,
              startDate: scheduledParams.startDate,
              endDate: scheduledParams.endDate,
              trakingCode: scheduledParams.trakingCode,
            }}
            onChange={(next: ScheduledFilters) =>
              setQuery({ ...next, page: 1 })
            }
            onClear={() =>
              setQuery({
                companyId: undefined,
                name: undefined,
                status: undefined,
                channel: undefined,
                modifiedByAI: undefined,
                startDate: undefined,
                endDate: undefined,
                trakingCode: undefined,
                page: 1,
              })
            }
          />

          <CampaignsTable
            data={scheduledQuery.data?.data ?? []}
            meta={scheduledQuery.data?.meta}
            isLoading={scheduledQuery.isLoading}
            isFetching={scheduledQuery.isFetching}
            error={scheduledQuery.error as Error | null}
            page={scheduledParams.page}
            limit={scheduledParams.limit}
            orderBy={scheduledParams.orderBy}
            orderDirection={scheduledParams.orderDirection}
            onPageChange={(page) => setQuery({ page })}
            onLimitChange={(limit) => setQuery({ limit, page: 1 })}
            onSortChange={(orderBy, orderDirection) =>
              setQuery({ orderBy, orderDirection, page: 1 })
            }
            onChangeStatus={(campaign, status) =>
              statusCampaignMutation.mutate({ id: campaign.id, status })
            }
            onReprocess={(campaign) => setCampaignToReprocess(campaign)}
            onDelete={(campaign) => setCampaignToDelete(campaign)}
            onRetry={() => scheduledQuery.refetch()}
          />
        </TabsContent>

        <TabsContent value="automatic" className="flex flex-col gap-4">
          <CampaignsListMetricsSummary
            metrics={automaticMetrics}
            isLoading={automaticQuery.isLoading}
          />

          <AutomaticCampaignsFilters
            values={{
              companyId: automaticParams.companyId,
              name: automaticParams.name,
              type: automaticParams.type,
              status: automaticParams.status,
              channel: automaticParams.channel,
              active: automaticParams.active,
              startDate: automaticParams.startDate,
              endDate: automaticParams.endDate,
              deleted: automaticParams.deleted,
            }}
            onChange={(next: AutomaticFilters) =>
              setQuery({ ...next, page: 1 })
            }
            onClear={() =>
              setQuery({
                companyId: undefined,
                name: undefined,
                type: undefined,
                status: undefined,
                channel: undefined,
                active: undefined,
                startDate: undefined,
                endDate: undefined,
                deleted: undefined,
                page: 1,
              })
            }
          />

          <AutomaticCampaignsTable
            data={automaticQuery.data?.data ?? []}
            meta={automaticQuery.data?.meta}
            isLoading={automaticQuery.isLoading}
            isFetching={automaticQuery.isFetching}
            error={automaticQuery.error as Error | null}
            page={automaticParams.page}
            limit={automaticParams.limit}
            orderBy={automaticParams.orderBy}
            orderDirection={automaticParams.orderDirection}
            onPageChange={(page) => setQuery({ page })}
            onLimitChange={(limit) => setQuery({ limit, page: 1 })}
            onSortChange={(orderBy, orderDirection) =>
              setQuery({ orderBy, orderDirection, page: 1 })
            }
            onChangeStatus={(campaign, status) =>
              statusAutomaticMutation.mutate({ id: campaign.id, status })
            }
            onToggleActive={(campaign) =>
              toggleAutomaticMutation.mutate(campaign.id)
            }
            onReprocess={(campaign) => setAutomaticToReprocess(campaign)}
            onDelete={(campaign) => setAutomaticToDelete(campaign)}
            onRestore={(campaign) =>
              restoreAutomaticMutation.mutate(campaign.id)
            }
            onRetry={() => automaticQuery.refetch()}
          />
        </TabsContent>
      </Tabs>

      <DeleteCampaignDialog
        open={Boolean(campaignToDelete)}
        onOpenChange={(open) => {
          if (!open) setCampaignToDelete(null)
        }}
        campaignName={campaignToDelete?.name}
        isPending={deleteCampaignMutation.isPending}
        onConfirm={() => {
          if (!campaignToDelete) return
          deleteCampaignMutation.mutate(campaignToDelete.id, {
            onSuccess: () => setCampaignToDelete(null),
          })
        }}
      />

      <ReprocessCampaignDialog
        open={Boolean(campaignToReprocess)}
        onOpenChange={(open) => {
          if (!open) setCampaignToReprocess(null)
        }}
        campaignName={campaignToReprocess?.name}
        isPending={reprocessCampaignMutation.isPending}
        variant="scheduled"
        onConfirm={() => {
          if (!campaignToReprocess) return
          reprocessCampaignMutation.mutate(campaignToReprocess.id, {
            onSuccess: () => setCampaignToReprocess(null),
          })
        }}
      />

      <DeleteAutomaticCampaignDialog
        open={Boolean(automaticToDelete)}
        onOpenChange={(open) => {
          if (!open) setAutomaticToDelete(null)
        }}
        campaignName={automaticToDelete?.name}
        isPending={deleteAutomaticMutation.isPending}
        onConfirm={() => {
          if (!automaticToDelete) return
          deleteAutomaticMutation.mutate(automaticToDelete.id, {
            onSuccess: () => setAutomaticToDelete(null),
          })
        }}
      />

      <ReprocessCampaignDialog
        open={Boolean(automaticToReprocess)}
        onOpenChange={(open) => {
          if (!open) setAutomaticToReprocess(null)
        }}
        campaignName={automaticToReprocess?.name}
        isPending={reprocessAutomaticMutation.isPending}
        variant="automatic"
        onConfirm={() => {
          if (!automaticToReprocess) return
          reprocessAutomaticMutation.mutate(automaticToReprocess.id, {
            onSuccess: () => setAutomaticToReprocess(null),
          })
        }}
      />
    </div>
  )
}
