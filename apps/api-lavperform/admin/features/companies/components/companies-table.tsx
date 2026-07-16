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

import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { Company, PaginationMeta } from "../types"
import { formatCnpj, formatDate } from "../utils"
import { CompanyStatusBadge } from "./company-status-badge"
import { CompanyActionsMenu } from "./company-actions-menu"

export type CompaniesTableProps = {
  data: Company[]
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
  onChangeState: (company: Company, state: Company["state"]) => void
  onDelete: (company: Company) => void
  onRetry: () => void
}

export function CompaniesTable({
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
  onChangeState,
  onDelete,
  onRetry,
}: CompaniesTableProps) {
  const sorting: SortingState = React.useMemo(
    () => [{ id: orderBy, desc: orderDirection === "desc" }],
    [orderBy, orderDirection]
  )

  const columns = React.useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar
              name={row.original.name}
              avatarUrl={row.original.avatarUrl}
              className="size-9 shrink-0"
            />
            <Link
              href={`/companies/${row.original.id}`}
              className="min-w-0 font-medium text-foreground hover:underline"
            >
              {row.original.name}
            </Link>
          </div>
        ),
      },
      {
        accessorKey: "cnpj",
        header: "CNPJ",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatCnpj(row.original.cnpj)}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "state",
        header: "Status",
        cell: ({ row }) => <CompanyStatusBadge status={row.original.state} />,
      },
      {
        accessorKey: "createdAt",
        header: "Criada em",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <CompanyActionsMenu
              company={row.original}
              onChangeState={(state) => onChangeState(row.original, state)}
              onDelete={() => onDelete(row.original)}
            />
          </div>
        ),
      },
    ],
    [onChangeState, onDelete]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualPagination: true,
    manualSorting: true,
    pageCount: meta?.totalPages ?? -1,
    getCoreRowModel: getCoreRowModel(),
  })

  const sortableKeys = new Set(["name", "createdAt", "cnpj", "email", "state"])

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
          Não foi possível carregar as empresas.
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
                  Nenhuma empresa encontrada.
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

      {meta && (
        <div className="flex flex-col items-center justify-between gap-3 px-1 md:flex-row">
          <div className="text-xs text-muted-foreground">
            {meta.total > 0 ? (
              <>
                Mostrando {(meta.page - 1) * meta.limit + 1}–
                {Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
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
              <label htmlFor="page-size" className="text-xs text-muted-foreground">
                Itens por página
              </label>
              <select
                id="page-size"
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
                disabled={!meta.hasPreviousPage}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                Página {meta.page} de {Math.max(meta.totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!meta.hasNextPage}
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
