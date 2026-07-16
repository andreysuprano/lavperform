import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { CampaignMetric } from "../types"
import { formatMetric, formatPercent } from "../utils"

export function CampaignMetricsCard({
  metrics,
}: {
  metrics: CampaignMetric[] | undefined
}) {
  const metric = metrics?.[0]

  if (!metric) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas</CardTitle>
          <CardDescription>
            Nenhuma métrica registrada para esta campanha.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas</CardTitle>
        <CardDescription>Desempenho da campanha.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricItem label="Enviadas" value={String(metric.messagesSent)} />
          <MetricItem
            label="Entregues"
            value={String(metric.messagesDelivered)}
          />
          <MetricItem label="Erros" value={String(metric.messagesError)} />
          <MetricItem
            label="Interações"
            value={String(metric.interactions)}
          />
          <MetricItem
            label="Taxa de conversão"
            value={formatPercent(metric.conversionRate)}
          />
          <MetricItem
            label="Vendas (R$)"
            value={formatMetric(metric.salesTotalAmount)}
          />
          <MetricItem
            label="Qtd. vendas"
            value={String(metric.salesTotalQuantity)}
          />
          <MetricItem
            label="Total clientes"
            value={String(metric.totalCustomers)}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
