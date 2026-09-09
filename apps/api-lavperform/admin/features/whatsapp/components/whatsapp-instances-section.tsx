"use client"

import { useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { CreateInstanceDialog } from "./create-instance-dialog"
import { DisconnectedConnectionsSection } from "./disconnected-connections-section"
import { EditAdminFieldsDialog } from "./edit-admin-fields-dialog"
import { InstancesFilters } from "./instances-filters"
import { InstancesTable } from "./instances-table"
import type { InstanceListFilters, WhatsappInstanceListItem } from "../types"
import {
  DEFAULT_INSTANCE_LIST_FILTERS,
  filterInstances,
  uniqueSystemNames,
} from "../utils"
import { useWhatsappInstances } from "../whatsapp-queries"

export function WhatsappInstancesSection() {
  const instancesQuery = useWhatsappInstances()

  const [filters, setFilters] = useState<InstanceListFilters>(
    DEFAULT_INSTANCE_LIST_FILTERS
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WhatsappInstanceListItem | null>(
    null
  )
  const [editOpen, setEditOpen] = useState(false)

  const filteredInstances = useMemo(
    () => filterInstances(instancesQuery.data ?? [], filters),
    [instancesQuery.data, filters]
  )

  const orphanCount = useMemo(
    () => (instancesQuery.data ?? []).filter((item) => !item.company).length,
    [instancesQuery.data]
  )

  const systemNames = useMemo(
    () => uniqueSystemNames(instancesQuery.data ?? []),
    [instancesQuery.data]
  )

  const totalCount = instancesQuery.data?.length ?? 0
  const filteredCount = filteredInstances.length

  function handleEditAdminFields(instance: WhatsappInstanceListItem) {
    setEditTarget(instance)
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {instancesQuery.data
              ? `${filteredCount} de ${totalCount} instância(s) na UAZAPI`
              : "Carregando instâncias..."}
            {orphanCount > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {orphanCount} órfã(s)
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Nova instância
        </Button>
      </div>

      <DisconnectedConnectionsSection />

      <InstancesFilters
        values={filters}
        systemNames={systemNames}
        onChange={setFilters}
        onClear={() => setFilters(DEFAULT_INSTANCE_LIST_FILTERS)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Instâncias UAZAPI (ao vivo)</CardTitle>
          <CardDescription>
            Por padrão mostra só as vinculadas às empresas deste produto. A
            assinatura UAZAPI é compartilhada — use Sistema / Vínculo = Todas
            para ver o servidor inteiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InstancesTable
            instances={filteredInstances}
            isLoading={instancesQuery.isLoading}
            error={instancesQuery.error as Error | null}
            onRetry={() => instancesQuery.refetch()}
            onEditAdminFields={handleEditAdminFields}
          />
        </CardContent>
      </Card>

      <CreateInstanceDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditAdminFieldsDialog
        instance={editTarget}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditTarget(null)
        }}
      />
    </div>
  )
}
