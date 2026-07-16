"use client"

import Link from "next/link"
import { PencilIcon } from "lucide-react"

import { UserAvatar } from "@/components/user-avatar"
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

import type { PaginationMeta, PanelAdministrator } from "../types"
import { formatDate } from "../utils"
import { AdminRoleBadge } from "./admin-role-badge"

export function AdministratorsTable({
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
  data: PanelAdministrator[]
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
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">Erro ao carregar administradores</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  {Array.from({ length: 6 }).map((__, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum administrador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={admin.name}
                        avatarUrl={admin.avatarUrl}
                        className="size-9 shrink-0"
                      />
                      <span className="font-medium">{admin.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {admin.email}
                  </TableCell>
                  <TableCell>
                    <AdminRoleBadge role={admin.role} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={admin.isActive ? "default" : "secondary"}>
                      {admin.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(admin.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      nativeButton={false}
                      render={
                        <Link href={`/administrators/${admin.id}/edit`} />
                      }
                    >
                      <PencilIcon />
                      <span className="sr-only">Editar</span>
                    </Button>
                  </TableCell>
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
              <label htmlFor="admin-page-size" className="text-xs text-muted-foreground">
                Itens por página
              </label>
              <select
                id="admin-page-size"
                value={limit}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
              >
                {[10, 20, 50].map((value) => (
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
