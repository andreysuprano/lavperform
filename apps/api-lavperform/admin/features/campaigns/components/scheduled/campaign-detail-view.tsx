"use client"

import { useState } from "react"
import Link from "next/link"
import { useAppRouter } from "@/hooks/use-app-router"
import { ArrowLeftIcon, MessageSquareIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ApiClientError } from "@/services/api-client"

import {
  useCampaign,
  useDeleteCampaign,
  useReprocessCampaign,
  useUpdateCampaignStatus,
} from "../../campaigns-queries"
import type { CampaignStatus } from "../../types"
import { formatDate } from "../../utils"
import { CampaignImagePreview } from "../campaign-image-preview"
import { CampaignMetricsCard } from "../campaign-metrics-card"
import { CampaignStatusBadge } from "../campaign-status-badge"
import { ChannelBadge } from "../channel-badge"
import { DeleteCampaignDialog } from "../delete-campaign-dialog"
import { ErrorMessagesTable } from "../error-messages-table"
import { ReprocessCampaignDialog } from "../reprocess-campaign-dialog"
import { SegmentationBadges } from "../segmentation-badges"
import { CampaignActionsMenu } from "./campaign-actions-menu"

export function CampaignDetailView({ campaignId }: { campaignId: string }) {
  const router = useAppRouter()
  const campaignQuery = useCampaign(campaignId)
  const statusMutation = useUpdateCampaignStatus()
  const reprocessMutation = useReprocessCampaign()
  const deleteMutation = useDeleteCampaign()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReprocess, setConfirmReprocess] = useState(false)

  if (campaignQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
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
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "A campanha que você procura não existe ou foi removida."
            : campaignQuery.error.message}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/campaigns?tab=scheduled" />}
        >
          <ArrowLeftIcon />
          Voltar para campanhas
        </Button>
      </div>
    )
  }

  const campaign = campaignQuery.data
  if (!campaign) return null

  function handleChangeStatus(status: CampaignStatus) {
    statusMutation.mutate({ id: campaignId, status })
  }

  function handleReprocess() {
    reprocessMutation.mutate(campaignId, {
      onSuccess: () => setConfirmReprocess(false),
    })
  }

  function handleDelete() {
    deleteMutation.mutate(campaignId, {
      onSuccess: () => {
        setConfirmDelete(false)
        router.push("/campaigns?tab=scheduled")
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/campaigns?tab=scheduled" />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {campaign.name}
              </h2>
              <CampaignStatusBadge status={campaign.status} />
              <ChannelBadge channel={campaign.channel} />
            </div>
            {campaign.company && (
              <Link
                href={`/companies/${campaign.company.id}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {campaign.company.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/campaigns/${campaign.id}/messages`} />}
            >
              <MessageSquareIcon />
              Mensagens
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/campaigns/${campaign.id}/edit`} />}
            >
              <PencilIcon />
              Editar
            </Button>
            <CampaignActionsMenu
              campaign={campaign}
              onChangeStatus={handleChangeStatus}
              onReprocess={() => setConfirmReprocess(true)}
              onDelete={() => setConfirmDelete(true)}
              triggerVariant="outline"
              triggerSize="default"
              showViewDetails={false}
            />
          </div>
        </div>
      </div>

      <CampaignMetricsCard metrics={campaign.campaignMetric} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="errors">Erros recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Dados da campanha</CardTitle>
              <CardDescription>Informações de agendamento e conteúdo.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <DetailRow
                  label="Agendada para"
                  value={formatDate(campaign.scheduledDate)}
                />
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Segmentação</dt>
                  <dd>
                    <SegmentationBadges segmentation={campaign.segmentation} />
                  </dd>
                </div>
                <DetailRow
                  label="Máx. envios/dia"
                  value={String(campaign.maxDailySends)}
                />
                <DetailRow
                  label="Modificada por IA"
                  value={campaign.modifiedByAI ? "Sim" : "Não"}
                />
                <DetailRow
                  label="Código rastreio"
                  value={campaign.trakingCode ?? "—"}
                />
                <DetailRow
                  label="Criada em"
                  value={formatDate(campaign.createdAt)}
                />
                <DetailRow
                  label="Atualizada em"
                  value={formatDate(campaign.updatedAt)}
                />
                <div className="md:col-span-2">
                  <DetailRow label="Mensagem" value={campaign.messageText} />
                </div>
                {campaign.imageUrl && (
                  <div className="md:col-span-2">
                    <CampaignImagePreview
                      label="Imagem"
                      urls={[campaign.imageUrl]}
                    />
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Erros recentes</CardTitle>
              <CardDescription>
                Amostra das últimas mensagens com erro (máx. 20).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorMessagesTable messages={campaign.messages} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteCampaignDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        campaignName={campaign.name}
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <ReprocessCampaignDialog
        open={confirmReprocess}
        onOpenChange={setConfirmReprocess}
        campaignName={campaign.name}
        isPending={reprocessMutation.isPending}
        onConfirm={handleReprocess}
        variant="scheduled"
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "break-all font-mono text-sm text-foreground"
            : "text-sm text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  )
}
