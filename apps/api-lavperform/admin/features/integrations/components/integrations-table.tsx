"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { CompanyIntegration, IntegrationPartner } from "../types"
import { formatDate, partnerSlugLabel, partnerSupportsImportHistory } from "../utils"
import { IntegrationActionsMenu } from "./integration-actions-menu"
import { IntegrationStatusBadge } from "./integration-status-badge"

export function IntegrationsTable({
  integrations,
  partnersById,
  isLoading,
  error,
  onRetry,
  onEdit,
  onToggleActive,
  onImportHistory,
  onDelete,
}: {
  integrations: CompanyIntegration[]
  partnersById: Map<string, IntegrationPartner>
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onEdit: (integration: CompanyIntegration) => void
  onToggleActive: (integration: CompanyIntegration) => void
  onImportHistory: (integration: CompanyIntegration) => void
  onDelete: (integration: CompanyIntegration) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Carregando integrações...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border p-8">
        <p className="text-sm text-destructive">{error.message}</p>
        <button
          type="button"
          className="text-sm font-medium underline"
          onClick={onRetry}
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (integrations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nenhuma integração configurada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione uma integração com um parceiro de cardápio ou PDV.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parceiro</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Credenciais</TableHead>
            <TableHead>Loja / URL</TableHead>
            <TableHead>Atualizada</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {integrations.map((integration) => {
            const partnerFromCatalog = integration.partnerId
              ? partnersById.get(integration.partnerId)
              : null
            const partner =
              partnerFromCatalog ??
              (integration.partner
                ? ({
                    id: integration.partner.id,
                    name: integration.partner.name,
                    partnerSlug: integration.partner.partnerSlug,
                    logoUrl: integration.partner.logoUrl,
                    baseUrlWebhook: integration.partner.baseUrlWebhook,
                    createdAt: "",
                    requiredFields: [],
                    optionalFields: [],
                    supportsImportHistory: partnerSupportsImportHistory(
                      integration.partner.partnerSlug,
                    ),
                    importHistoryRoute: "none",
                  } as IntegrationPartner)
                : null)

            return (
              <TableRow key={integration.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <PartnerLogo
                      name={integration.partner?.name}
                      logoUrl={
                        partner?.logoUrl ?? integration.partner?.logoUrl
                      }
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-medium">
                        {integration.partner?.name ?? "—"}
                      </span>
                      <Badge
                        variant="outline"
                        className="w-fit font-mono text-xs"
                      >
                        {partnerSlugLabel(integration.partner?.partnerSlug)}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <IntegrationStatusBadge active={integration.active} />
                </TableCell>
                <TableCell>
                  <CredentialSummary integration={integration} />
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[200px] flex-col gap-0.5 text-xs">
                    {integration.merchantId && (
                      <span className="truncate font-mono">
                        {integration.merchantId}
                      </span>
                    )}
                    {integration.digitalMenuUrl && (
                      <span className="truncate text-muted-foreground">
                        {integration.digitalMenuUrl}
                      </span>
                    )}
                    {!integration.merchantId && !integration.digitalMenuUrl && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(integration.updatedAt)}
                </TableCell>
                <TableCell>
                  <IntegrationActionsMenu
                    integration={integration}
                    partner={partner}
                    onEdit={() => onEdit(integration)}
                    onToggleActive={() => onToggleActive(integration)}
                    onImportHistory={() => onImportHistory(integration)}
                    onDelete={() => onDelete(integration)}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function PartnerLogo({
  name,
  logoUrl,
}: {
  name?: string | null
  logoUrl?: string | null
}) {
  const [failed, setFailed] = useState(false)
  const initials = (name?.trim().slice(0, 2) || "?").toUpperCase()
  const showImage = Boolean(logoUrl?.trim()) && !failed

  if (!showImage) {
    return (
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        {initials}
      </div>
    )
  }

  return (
    <img
      src={logoUrl!}
      alt={name ? `Logo ${name}` : "Logo do integrador"}
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-md border object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function CredentialSummary({
  integration,
}: {
  integration: CompanyIntegration
}) {
  const items: string[] = []
  if (integration.hasApiKey) items.push("API Key")
  if (integration.hasApiSecret) items.push("Secret")
  if (integration.hasUsername) items.push("Usuário")
  if (integration.hasPassword) items.push("Senha")

  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  return (
    <span className="text-xs text-muted-foreground">{items.join(" · ")}</span>
  )
}
