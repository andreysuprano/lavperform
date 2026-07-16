"use client"

import * as React from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { AutomaticCampaign, PaginationMeta } from "../../types"
import {
  AUTOMATIC_CAMPAIGN_TYPE_LABELS,
  enrichPaginationMeta,
  formatDate,
  getPrimaryMetric,
} from "../../utils"
import { AutomaticCampaignStatusBadge } from "../automatic-campaign-status-badge"
import { ChannelBadge } from "../channel-badge"
import { AutomaticCampaignActionsMenu } from "./automatic-campaign-actions-menu"

export function AutomaticCampaignsTable({
  data,
  meta,
  isLoading,
  isFetching,
  error,
  page,
  limit,
  orderBy,
  orderDirection,
  onPageChange,
  onLimitChange,
  onSortChange,
  onChangeStatus,
  onToggleActive,
  onReprocess,
  onDelete,
  onRestore,
  onRetry,
}: {
  data: AutomaticCampaign[]
  meta?: PaginationMeta
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  page: number
  limit: number
  orderBy: string
  orderDirection: "asc" | "desc"
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onSortChange: (orderBy: string, orderDirection: "asc" | "desc") => void
  onChangeStatus: (
    campaign: AutomaticCampaign,
    status: AutomaticCampaign["status"]
  ) => void
  onToggleActive: (campaign: AutomaticCampaign) => void
  onReprocess: (campaign: AutomaticCampaign) => void
  onDelete: (campaign: AutomaticCampaign) => void
  onRestore: (campaign: AutomaticCampaign) => void
  onRetry: () => void
}) {
  const enrichedMeta = meta ? enrichPaginationMeta(meta) : undefined

  const sorting: SortingState = React.useMemo(
    () => [{ id: orderBy, desc: orderDirection === "desc" }],
    [orderBy, orderDirection]
  )

  const columns = React.useMemo<ColumnDef<AutomaticCampaign>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <Link
            href={`/campaigns/automatic/${row.original.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "company",
        header: "Empresa",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.company?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {AUTOMATIC_CAMPAIGN_TYPE_LABELS[row.original.type]}
          </span>
        ),
      },
      {
        accessorKey: "channel",
        header: "Canal",
        cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <AutomaticCampaignStatusBadge status={row.original.status} />
        ),
      },
      {
        id: "active",
        header: "Ativa",
        cell: ({ row }) =>
          row.original.deletedAt ? (
            <Badge variant="outline" className="text-muted-foreground">
              Excluída
            </Badge>
          ) : (
            <Badge
              className={
                row.original.active
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              }
            >
              {row.original.active ? "Sim" : "Não"}
            </Badge>
          ),
      },
      {
        accessorKey: "lastProcessedAt",
        header: "Último processamento",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.lastProcessedAt)}
          </span>
        ),
      },
      {
        id: "metrics",
        header: "Enviadas / Erros",
        cell: ({ row }) => {
          const { sent, errors } = getPrimaryMetric(row.original.campaignMetric)
          return (
            <span className="tabular-nums text-muted-foreground">
              {sent} / {errors}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <AutomaticCampaignActionsMenu
              campaign={row.original}
              onChangeStatus={(status) =>
                onChangeStatus(row.original, status)
              }
              onToggleActive={() => onToggleActive(row.original)}
              onReprocess={() => onReprocess(row.original)}
              onDelete={() => onDelete(row.original)}
              onRestore={() => onRestore(row.original)}
            />
          </div>
        ),
      },
    ],
    [onChangeStatus, onToggleActive, onReprocess, onDelete, onRestore]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualPagination: true,
    manualSorting: true,
    pageCount: enrichedMeta?.totalPages ?? -1,
    getCoreRowModel: getCoreRowModel(),
  })

  const sortableKeys = new Set([
    "name",
    "type",
    "status",
    "startDate",
    "endDate",
    "createdAt",
    "updatedAt",
    "lastProcessedAt",
  ])

  function toggleSort(columnId: string) {
    if (!sortableKeys.has(columnId)) return
    if (orderBy !== columnId) {
      onSortChange(columnId, "asc")
      return
    }
    onSortChange(columnId, orderDirection === "asc" ? "desc" : "asc")
  }

  function renderSortIcon(columnId: string) {
    if (!sortableKeys.has(columnId)) return null
    if (orderBy !== columnId)
      return <ArrowUpDownIcon className="size-3 text-muted-foreground" />
    return orderDirection === "asc" ? (
      <ArrowUpIcon className="size-3" />
    ) : (
      <ArrowDownIcon className="size-3" />
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as campanhas automáticas.
        </p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const isEmpty = !isLoading && data.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const id = header.column.id
                  const sortable = sortableKeys.has(id)
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-foreground"
                          onClick={() => toggleSort(id)}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {renderSortIcon(id)}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {columns.map((_col, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhuma campanha automática encontrada.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {enrichedMeta && (
        <div className="flex flex-col items-center justify-between gap-3 px-1 md:flex-row">
          <div className="text-xs text-muted-foreground">
            {enrichedMeta.total > 0 ? (
              <>
                Mostrando {(enrichedMeta.page - 1) * enrichedMeta.limit + 1}–
                {Math.min(
                  enrichedMeta.page * enrichedMeta.limit,
                  enrichedMeta.total
                )}{" "}
                de {enrichedMeta.total}
              </>
            ) : (
              "Sem resultados"
            )}
            {isFetching && !isLoading && (
              <span className="ml-2 text-foreground">atualizando…</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="auto-page-size" className="text-xs text-muted-foreground">
                Itens por página
              </label>
              <select
                id="auto-page-size"
                value={limit}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!enrichedMeta.hasPreviousPage}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                Página {enrichedMeta.page} de{" "}
                {Math.max(enrichedMeta.totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!enrichedMeta.hasNextPage}
                onClick={() => onPageChange(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
