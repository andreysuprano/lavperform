"use client"

import type { ComponentType } from "react"
import {
  Building2Icon,
  CoinsIcon,
  MegaphoneIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useOverviewStats } from "../overview-queries"
import {
  formatCents,
  formatBRL,
  formatNumber,
} from "../utils"
import { OverviewStaleBadge } from "./overview-stale-badge"

export function OverviewMetricsGrid() {
  const { data, isLoading, isError, error } = useOverviewStats()

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Não foi possível carregar as métricas
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Visão geral da plataforma. Dados atualizados a cada 2 horas.
        </p>
        <OverviewStaleBadge stats={data} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Empresas cadastradas"
          description="Total na plataforma"
          value={formatNumber(data.companiesCount)}
          icon={Building2Icon}
        />
        <MetricCard
          title="Campanhas ativas"
          description="Automáticas ativas + agendadas em execução"
          value={formatNumber(data.activeCampaignsCount)}
          icon={MegaphoneIcon}
        />
        <MetricCard
          title="Customers na base"
          description="Cadastrados por todos os clientes"
          value={formatNumber(data.customersCount)}
          icon={UsersIcon}
        />
        <MetricCard
          title="MRR estimado"
          description="Assinaturas ativas (normalizado mensal)"
          value={formatCents(data.mrrCents)}
          icon={WalletIcon}
        />
        <MetricCard
          title="Recargas pagas"
          description="Volume total de créditos recarregados"
          value={formatCents(data.topupsPaidCents)}
          icon={CoinsIcon}
        />
        <MetricCard
          title="Receita incentivada"
          description={`${formatNumber(data.incentivizedOrdersCount)} pedidos atribuídos`}
          value={formatBRL(data.incentivizedRevenue)}
          icon={TrendingUpIcon}
        />
      </div>
    </div>
  )
}

function MetricCard({
  title,
  description,
  value,
  icon: Icon,
}: {
  title: string
  description: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {value}
            </CardTitle>
          </div>
          <div className="rounded-md border bg-muted/40 p-2 text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
