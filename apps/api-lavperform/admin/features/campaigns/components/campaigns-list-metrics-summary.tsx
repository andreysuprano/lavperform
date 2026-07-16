import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { AggregatedCampaignMetrics } from "../utils"
import { formatMetric, formatPercent } from "../utils"

export function CampaignsListMetricsSummary({
  metrics,
  isLoading,
}: {
  metrics: AggregatedCampaignMetrics
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    )
  }

  if (metrics.campaignCount === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Métricas</CardTitle>
        <CardDescription>
          Resumo agregado das {metrics.campaignCount} campanhas nesta página.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SummaryItem label="Enviadas" value={String(metrics.messagesSent)} />
          <SummaryItem
            label="Entregues"
            value={String(metrics.messagesDelivered)}
          />
          <SummaryItem label="Erros" value={String(metrics.messagesError)} />
          <SummaryItem
            label="Interações"
            value={String(metrics.interactions)}
          />
          <SummaryItem label="Vendas" value={String(metrics.salesTotalQuantity)} />
          <SummaryItem
            label="Receita (R$)"
            value={formatMetric(metrics.salesTotalAmount)}
          />
          <SummaryItem
            label="Conversão"
            value={formatPercent(metrics.conversionRate)}
          />
          <SummaryItem
            label="Campanhas"
            value={String(metrics.campaignCount)}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
