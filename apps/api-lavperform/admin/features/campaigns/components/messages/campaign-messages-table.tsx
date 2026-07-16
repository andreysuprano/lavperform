"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table"

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

import type { CampaignMessage, PaginationMeta } from "../../types"
import { enrichPaginationMeta, formatDate, formatMetric, formatSalesOrigin } from "../../utils"
import { ChannelBadge } from "../channel-badge"
import { MessageStatusBadge } from "../message-status-badge"

export function CampaignMessagesTable({
  data,
  meta,
  isLoading,
  isFetching,
  error,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onRetry,
}: {
  data: CampaignMessage[]
  meta?: PaginationMeta
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  page: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onRetry: () => void
}) {
  const enrichedMeta = meta ? enrichPaginationMeta(meta) : undefined

  const columns = React.useMemo<ColumnDef<CampaignMessage>[]>(
    () => [
      {
        accessorKey: "phone",
        header: "Telefone",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.phone}</span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Cliente",
        cell: ({ row }) => row.original.customerName ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <MessageStatusBadge status={row.original.status} />
        ),
      },
      {
        accessorKey: "channel",
        header: "Canal",
        cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
      },
      {
        accessorKey: "attempts",
        header: "Tentativas",
      },
      {
        id: "hasOrder",
        header: "Venda",
        cell: ({ row }) =>
          row.original.hasOrder ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              Sim
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Não
            </Badge>
          ),
      },
      {
        id: "salesTotalAmount",
        header: "Valor (R$)",
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.hasOrder
              ? formatMetric(row.original.salesTotalAmount)
              : "—"}
          </span>
        ),
      },
      {
        id: "salesOrigin",
        header: "Origem",
        cell: ({ row }) => (
          <span className="max-w-[140px] truncate text-xs text-muted-foreground">
            {formatSalesOrigin(row.original.salesOrigin)}
          </span>
        ),
      },
      {
        accessorKey: "error",
        header: "Erro",
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate text-xs text-muted-foreground">
            {row.original.error ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Criada em",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    pageCount: enrichedMeta?.totalPages ?? -1,
    getCoreRowModel: getCoreRowModel(),
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as mensagens.
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
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {columns.map((_col, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-muted" />
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
                  Nenhuma mensagem encontrada.
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
              <label htmlFor="msg-page-size" className="text-xs text-muted-foreground">
                Itens por página
              </label>
              <select
                id="msg-page-size"
                value={limit}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
              >
                {[20, 50, 100].map((value) => (
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
