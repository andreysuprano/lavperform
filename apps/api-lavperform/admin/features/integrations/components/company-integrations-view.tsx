"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCompany } from "@/features/companies/companies-queries"

import {
  useCompanyIntegrations,
  useDeleteCompanyIntegration,
  useIntegrationPartners,
  useToggleIntegrationActive,
} from "../integrations-queries"
import type { CompanyIntegration } from "../types"
import { DeleteIntegrationDialog } from "./delete-integration-dialog"
import { ImportHistoryDialog } from "./import-history-dialog"
import { IntegrationFormDialog } from "./integration-form-dialog"
import { IntegrationsTable } from "./integrations-table"

export function CompanyIntegrationsView({ companyId }: { companyId: string }) {
  const companyQuery = useCompany(companyId)
  const partnersQuery = useIntegrationPartners()
  const integrationsQuery = useCompanyIntegrations(companyId)

  const toggleMutation = useToggleIntegrationActive(companyId)
  const deleteMutation = useDeleteCompanyIntegration(companyId)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [selectedIntegration, setSelectedIntegration] = useState<
    CompanyIntegration | undefined
  >()

  const [importTarget, setImportTarget] = useState<CompanyIntegration | undefined>()
  const [importOpen, setImportOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CompanyIntegration | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const partnersById = useMemo(() => {
    return new Map((partnersQuery.data ?? []).map((p) => [p.id, p]))
  }, [partnersQuery.data])

  function openCreate() {
    setFormMode("create")
    setSelectedIntegration(undefined)
    setFormOpen(true)
  }

  function openEdit(integration: CompanyIntegration) {
    setFormMode("edit")
    setSelectedIntegration(integration)
    setFormOpen(true)
  }

  function handleToggleActive(integration: CompanyIntegration) {
    toggleMutation.mutate({
      integrationId: integration.id,
      active: !integration.active,
    })
  }

  function handleImportHistory(integration: CompanyIntegration) {
    setImportTarget(integration)
    setImportOpen(true)
  }

  function handleDeleteRequest(integration: CompanyIntegration) {
    setDeleteTarget(integration)
    setDeleteOpen(true)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        setDeleteTarget(undefined)
      },
    })
  }

  const importPartner =
    (importTarget?.partnerId
      ? partnersById.get(importTarget.partnerId)
      : undefined) ?? null

  return (
    <div className="flex flex-col gap-6">
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
            <h1 className="text-xl font-semibold tracking-tight">Integrações</h1>
            <p className="text-sm text-muted-foreground">
              {companyQuery.data?.name ?? companyId}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          Nova integração
        </Button>
      </div>

      <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Configure as integrações do parceiro e gerencie as importações e os dados importados.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Integrações da empresa</CardTitle>
          <CardDescription>
            Cada parceiro integrador pode ter uma configuração com credenciais
            específicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsTable
            integrations={integrationsQuery.data ?? []}
            partnersById={partnersById}
            isLoading={integrationsQuery.isLoading}
            error={integrationsQuery.error}
            onRetry={() => integrationsQuery.refetch()}
            onEdit={openEdit}
            onToggleActive={handleToggleActive}
            onImportHistory={handleImportHistory}
            onDelete={handleDeleteRequest}
          />
        </CardContent>
      </Card>

      <IntegrationFormDialog
        companyId={companyId}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        integration={selectedIntegration}
      />

      {importTarget && (
        <ImportHistoryDialog
          companyId={companyId}
          integration={importTarget}
          partner={importPartner}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
      )}

      <DeleteIntegrationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        partnerName={deleteTarget?.partner?.name}
        isPending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
