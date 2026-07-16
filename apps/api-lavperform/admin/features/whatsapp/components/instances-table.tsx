"use client"

import Link from "next/link"
import { MoreHorizontalIcon, PencilIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { WhatsappInstanceListItem } from "../types"
import { formatDate, truncateToken } from "../utils"
import { UazapiStatusBadge } from "./uazapi-status-badge"

export function InstanceActionsMenu({
  instance,
  onEditAdminFields,
}: {
  instance: WhatsappInstanceListItem
  onEditAdminFields: (instance: WhatsappInstanceListItem) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Ações" />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditAdminFields(instance)}>
          <PencilIcon />
          Editar campos admin
        </DropdownMenuItem>
        {instance.company && (
          <DropdownMenuItem
            render={<Link href={`/whatsapp/company/${instance.company.id}`} />}
            nativeButton={false}
          >
            Ver por empresa
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function InstancesTable({
  instances,
  isLoading,
  error,
  onRetry,
  onEditAdminFields,
}: {
  instances: WhatsappInstanceListItem[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onEditAdminFields: (instance: WhatsappInstanceListItem) => void
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as instâncias.
        </p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {["Nome", "Status", "Empresa", "Token", "Desconexão", "Ações"].map(
                (header) => (
                  <TableHead key={header}>{header}</TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {Array.from({ length: 6 }).map((__, colIdx) => (
                  <TableCell key={colIdx}>
                    <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nenhuma instância encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste os filtros ou crie uma nova instância na UAZAPI.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status UAZAPI</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>Última desconexão</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((instance) => (
            <TableRow
              key={instance.id}
              className={!instance.company ? "bg-amber-500/5" : undefined}
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{instance.name}</span>
                  {instance.systemName && (
                    <span className="text-xs text-muted-foreground">
                      {instance.systemName}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <UazapiStatusBadge status={instance.status} />
              </TableCell>
              <TableCell>
                {instance.company ? (
                  <Link
                    href={`/whatsapp/company/${instance.company.id}`}
                    className="font-medium hover:underline"
                  >
                    {instance.company.name}
                  </Link>
                ) : (
                  <Badge variant="outline">Órfã</Badge>
                )}
              </TableCell>
              <TableCell>
                <span
                  className="font-mono text-xs text-muted-foreground"
                  title={instance.token}
                >
                  {truncateToken(instance.token)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(instance.lastDisconnect)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <InstanceActionsMenu
                    instance={instance}
                    onEditAdminFields={onEditAdminFields}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
