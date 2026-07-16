"use client"

import { useState } from "react"
import Link from "next/link"
import { useAppRouter } from "@/hooks/use-app-router"
import { ArrowLeftIcon, MessageSquareIcon, PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
  useAutomaticCampaign,
  useDeleteAutomaticCampaign,
  useReprocessAutomaticCampaign,
  useRestoreAutomaticCampaign,
  useToggleAutomaticCampaignActive,
  useUpdateAutomaticCampaignStatus,
} from "../../campaigns-queries"
import type { AutomaticCampaignStatus } from "../../types"
import {
  AUTOMATIC_CAMPAIGN_TYPE_LABELS,
  formatDate,
  formatSendScheduleLabel,
  parseImagesJson,
} from "../../utils"
import { AutomaticCampaignStatusBadge } from "../automatic-campaign-status-badge"
import { CampaignImagePreview } from "../campaign-image-preview"
import { CampaignMetricsCard } from "../campaign-metrics-card"
import { ChannelBadge } from "../channel-badge"
import { DeleteAutomaticCampaignDialog } from "../delete-automatic-campaign-dialog"
import { ErrorMessagesTable } from "../error-messages-table"
import { ReprocessCampaignDialog } from "../reprocess-campaign-dialog"
import { SegmentationBadges } from "../segmentation-badges"
import { AutomaticCampaignActionsMenu } from "./automatic-campaign-actions-menu"

export function AutomaticCampaignDetailView({
  campaignId,
}: {
  campaignId: string
}) {
  const router = useAppRouter()
  const campaignQuery = useAutomaticCampaign(campaignId)
  const statusMutation = useUpdateAutomaticCampaignStatus()
  const toggleMutation = useToggleAutomaticCampaignActive()
  const reprocessMutation = useReprocessAutomaticCampaign()
  const deleteMutation = useDeleteAutomaticCampaign()
  const restoreMutation = useRestoreAutomaticCampaign()

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
          {isNotFound
            ? "Campanha automática não encontrada"
            : "Erro ao carregar campanha"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "A campanha que você procura não existe."
            : campaignQuery.error.message}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/campaigns?tab=automatic" />}
        >
          <ArrowLeftIcon />
          Voltar para campanhas
        </Button>
      </div>
    )
  }

  const campaign = campaignQuery.data
  if (!campaign) return null

  const isDeleted = Boolean(campaign.deletedAt)
  const legacyImages = parseImagesJson(campaign.images)

  function handleChangeStatus(status: AutomaticCampaignStatus) {
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
        router.push("/campaigns?tab=automatic&deleted=true")
      },
    })
  }

  function handleRestore() {
    restoreMutation.mutate(campaignId)
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/campaigns?tab=automatic" />}
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
              <AutomaticCampaignStatusBadge status={campaign.status} />
              <ChannelBadge channel={campaign.channel} />
              <Badge variant="outline">
                {AUTOMATIC_CAMPAIGN_TYPE_LABELS[campaign.type]}
              </Badge>
              {isDeleted ? (
                <Badge variant="outline" className="text-destructive">
                  Excluída
                </Badge>
              ) : (
                <Badge
                  className={
                    campaign.active
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {campaign.active ? "Ativa" : "Inativa"}
                </Badge>
              )}
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
            {!isDeleted && (
              <>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/campaigns/automatic/${campaign.id}/messages`} />
                  }
                >
                  <MessageSquareIcon />
                  Mensagens
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link href={`/campaigns/automatic/${campaign.id}/edit`} />
                  }
                >
                  <PencilIcon />
                  Editar
                </Button>
              </>
            )}
            <AutomaticCampaignActionsMenu
              campaign={campaign}
              onChangeStatus={handleChangeStatus}
              onToggleActive={() => toggleMutation.mutate(campaignId)}
              onReprocess={() => setConfirmReprocess(true)}
              onDelete={() => setConfirmDelete(true)}
              onRestore={handleRestore}
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
          <TabsTrigger value="creatives">Criativos</TabsTrigger>
          <TabsTrigger value="gifts">Brindes</TabsTrigger>
          <TabsTrigger value="coupon">Cupom</TabsTrigger>
          <TabsTrigger value="errors">Erros</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Dados da campanha</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Segmentação</dt>
                  <dd>
                    <SegmentationBadges segmentation={campaign.segmentation} />
                  </dd>
                </div>
                <DetailRow
                  label="Início"
                  value={formatDate(campaign.startDate)}
                />
                <DetailRow
                  label="Fim"
                  value={formatDate(campaign.endDate)}
                />
                <DetailRow
                  label="Máx. envios/dia"
                  value={String(campaign.maxDailySends)}
                />
                <DetailRow
                  label="Horário de envio"
                  value={formatSendScheduleLabel(
                    campaign.sendTimeStart,
                    campaign.sendTimeEnd
                  )}
                />
                <DetailRow
                  label="Último processamento"
                  value={formatDate(campaign.lastProcessedAt)}
                />
                <DetailRow
                  label="Dias da semana"
                  value={
                    campaign.daysOfWeek?.length
                      ? campaign.daysOfWeek.join(", ")
                      : "—"
                  }
                />
                <div className="md:col-span-2">
                  <DetailRow label="Mensagem legacy" value={campaign.messageText} />
                </div>
                {legacyImages.length > 0 && (
                  <div className="md:col-span-2">
                    <CampaignImagePreview
                      label="Imagens legacy"
                      urls={legacyImages}
                    />
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader>
              <CardTitle>Criativos</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.creatives && campaign.creatives.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {campaign.creatives.map((creative) => (
                    <div
                      key={creative.id ?? creative.title}
                      className="rounded-lg border p-4"
                    >
                      <p className="font-medium">{creative.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {creative.message}
                      </p>
                      {creative.imageUrls?.length > 0 && (
                        <CampaignImagePreview
                          label="Imagens"
                          urls={creative.imageUrls}
                          className="mt-3"
                        />
                      )}
                      {creative.link && (
                        <p className="mt-1 text-xs">{creative.link}</p>
                      )}
                      {creative.metaTemplate && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Template Meta: {creative.metaTemplate.name} (
                          {creative.metaTemplate.status})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum criativo configurado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts">
          <Card>
            <CardHeader>
              <CardTitle>Brindes</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.gifts && campaign.gifts.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {campaign.gifts.map((gift) => (
                    <li
                      key={gift.id ?? `${gift.type}-${gift.value}`}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      {gift.type} — {gift.value} {gift.unit}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum brinde configurado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupon">
          <Card>
            <CardHeader>
              <CardTitle>Cupom</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.coupon ? (
                <dl className="grid gap-3 md:grid-cols-2">
                  <DetailRow label="Código" value={campaign.coupon.code} />
                  <DetailRow
                    label="Descrição"
                    value={campaign.coupon.description}
                  />
                  <DetailRow
                    label="Ativo"
                    value={campaign.coupon.active ? "Sim" : "Não"}
                  />
                  <DetailRow
                    label="Válido até"
                    value={formatDate(campaign.coupon.validUntil)}
                  />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum cupom vinculado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Erros recentes</CardTitle>
              <CardDescription>
                Amostra das últimas mensagens com erro.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorMessagesTable messages={campaign.errorSample} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteAutomaticCampaignDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        campaignName={campaign.name}
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      {!isDeleted && (
        <ReprocessCampaignDialog
          open={confirmReprocess}
          onOpenChange={setConfirmReprocess}
          campaignName={campaign.name}
          isPending={reprocessMutation.isPending}
          onConfirm={handleReprocess}
          variant="automatic"
        />
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
