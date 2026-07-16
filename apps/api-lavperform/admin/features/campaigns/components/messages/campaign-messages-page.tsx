"use client"

import { useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiClientError } from "@/services/api-client"

import {
  useAutomaticCampaign,
  useAutomaticCampaignMessages,
  useCampaign,
  useCampaignMessages,
} from "../../campaigns-queries"
import type { CampaignChannel, MessageListParams, MessageStatus } from "../../types"
import {
  CAMPAIGN_CHANNEL_VALUES,
  MESSAGE_STATUS_VALUES,
} from "../../types"
import { CampaignMessagesFilters } from "./campaign-messages-filters"
import { CampaignMessagesTable } from "./campaign-messages-table"

function parseMessageSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")
  const orderDirection: "asc" | "desc" =
    searchParams.get("orderDirection") === "asc" ? "asc" : "desc"
  const phone = searchParams.get("phone") ?? undefined
  const customerName = searchParams.get("customerName") ?? undefined
  const channelParam = searchParams.get("channel")
  const channel =
    channelParam &&
    (CAMPAIGN_CHANNEL_VALUES as string[]).includes(channelParam)
      ? (channelParam as CampaignChannel)
      : undefined
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined
  const error = searchParams.get("error") ?? undefined
  const hasSaleParam = searchParams.get("hasSale")
  const hasSale =
    hasSaleParam === "true" ? true : hasSaleParam === "false" ? false : undefined
  const statusParams = searchParams.getAll("status")
  const status = statusParams.filter((s) =>
    (MESSAGE_STATUS_VALUES as string[]).includes(s)
  ) as MessageStatus[]

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    orderDirection,
    phone,
    customerName,
    channel,
    startDate,
    endDate,
    error,
    hasSale,
    status: status.length > 0 ? status : undefined,
  }
}

export function CampaignMessagesPage({
  campaignId,
  variant,
}: {
  campaignId: string
  variant: "scheduled" | "automatic"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const basePath =
    variant === "scheduled"
      ? `/campaigns/${campaignId}`
      : `/campaigns/automatic/${campaignId}`
  const messagesPath = `${basePath}/messages`

  const params = useMemo(
    () => parseMessageSearchParams(searchParams),
    [searchParams]
  )

  const scheduledCampaign = useCampaign(
    variant === "scheduled" ? campaignId : undefined
  )
  const automaticCampaign = useAutomaticCampaign(
    variant === "automatic" ? campaignId : undefined
  )

  const scheduledMessages = useCampaignMessages(
    variant === "scheduled" ? campaignId : undefined,
    params
  )
  const automaticMessages = useAutomaticCampaignMessages(
    variant === "automatic" ? campaignId : undefined,
    params
  )

  const campaignQuery =
    variant === "scheduled" ? scheduledCampaign : automaticCampaign
  const messagesQuery =
    variant === "scheduled" ? scheduledMessages : automaticMessages

  const setQuery = useCallback(
    (next: Partial<MessageListParams>) => {
      const url = new URLSearchParams(searchParams.toString())
      const merged: Record<string, unknown> = { ...params, ...next }

      url.delete("status")
      Object.entries(merged).forEach(([key, value]) => {
        if (key === "status" && Array.isArray(value)) {
          value.forEach((item) => url.append("status", String(item)))
          return
        }
        if (value === undefined || value === null || value === "") {
          url.delete(key)
        } else {
          url.set(key, String(value))
        }
      })

      const qs = url.toString()
      router.replace(qs ? `${messagesPath}?${qs}` : messagesPath, {
        scroll: false,
      })
    },
    [params, router, searchParams, messagesPath]
  )

  const handleChangeFilters = useCallback(
    (
      next: Pick<
        MessageListParams,
        | "phone"
        | "customerName"
        | "channel"
        | "startDate"
        | "endDate"
        | "error"
        | "status"
        | "hasSale"
      >
    ) => {
      setQuery({ ...next, page: 1 })
    },
    [setQuery]
  )

  const handleClearFilters = useCallback(() => {
    setQuery({
      phone: undefined,
      customerName: undefined,
      channel: undefined,
      startDate: undefined,
      endDate: undefined,
      error: undefined,
      hasSale: undefined,
      status: undefined,
      page: 1,
    })
  }, [setQuery])

  if (campaignQuery.isLoading) {
    return <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
  }

  if (campaignQuery.error) {
    const isNotFound =
      campaignQuery.error instanceof ApiClientError &&
      campaignQuery.error.statusCode === 404

    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-8">
        <p className="text-base font-medium">
          {isNotFound ? "Campanha não encontrada" : "Erro ao carregar campanha"}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={basePath} />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
      </div>
    )
  }

  const campaignName = campaignQuery.data?.name ?? "Campanha"

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={basePath} />}
        >
          <ArrowLeftIcon />
          Voltar para {campaignName}
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mensagens</h2>
          <p className="text-sm text-muted-foreground">{campaignName}</p>
        </div>
      </div>

      <CampaignMessagesFilters
        values={{
          phone: params.phone,
          customerName: params.customerName,
          channel: params.channel,
          startDate: params.startDate,
          endDate: params.endDate,
          error: params.error,
          hasSale: params.hasSale,
          status: params.status,
        }}
        onChange={handleChangeFilters}
        onClear={handleClearFilters}
      />

      <CampaignMessagesTable
        data={messagesQuery.data?.data ?? []}
        meta={messagesQuery.data?.meta}
        isLoading={messagesQuery.isLoading}
        isFetching={messagesQuery.isFetching}
        error={messagesQuery.error as Error | null}
        page={params.page}
        limit={params.limit}
        onPageChange={(page) => setQuery({ page })}
        onLimitChange={(limit) => setQuery({ limit, page: 1 })}
        onRetry={() => messagesQuery.refetch()}
      />
    </div>
  )
}
