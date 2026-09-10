"use client"

import Link from "next/link"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { ConnectionSnapshotStatus, WhatsappConnectionSnapshot } from "../types"
import { CONNECTION_SNAPSHOT_STATUS_LABELS, formatDate } from "../utils"
import { useDisconnectedConnections } from "../whatsapp-queries"

function SnapshotStatusBadge({ status }: { status: ConnectionSnapshotStatus }) {
  const variant =
    status === "absent" || status === "disconnected"
      ? "destructive"
      : "outline"

  return (
    <Badge variant={variant}>
      {CONNECTION_SNAPSHOT_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

export function DisconnectedConnectionsSection() {
  const query = useDisconnectedConnections()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sem conexão</CardTitle>
        <CardDescription>
          Empresas deste produto sem WhatsApp conectado: quem desconectou
          (com data), quem sumiu na limpeza da UAZAPI e quem nunca criou
          instância. Não mistura a outra marca da mesma assinatura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DisconnectedConnectionsTable
          rows={query.data ?? []}
          isLoading={query.isLoading}
          error={query.error as Error | null}
          onRetry={() => query.refetch()}
        />
      </CardContent>
    </Card>
  )
}

function DisconnectedConnectionsTable({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: WhatsappConnectionSnapshot[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar as desconexões.
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
              {[
                "Empresa",
                "Instância",
                "Status",
                "Desconexão",
                "Na UAZAPI",
              ].map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                {Array.from({ length: 5 }).map((__, colIdx) => (
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

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nenhuma empresa sem conexão</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando uma lavanderia desconectar ou ainda não tiver instância, ela
          aparece aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Instância</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última desconexão</TableHead>
            <TableHead>Na UAZAPI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/whatsapp/company/${row.companyId}`}
                  className="font-medium hover:underline"
                >
                  {row.company.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {row.company.email}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {row.instanceName ?? (row.neverCreated ? "Sem instância" : "—")}
                  </span>
                  {row.systemName && (
                    <span className="text-xs text-muted-foreground">
                      {row.systemName}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <SnapshotStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.lastDisconnectedAt)}
              </TableCell>
              <TableCell>
                {row.existsOnUazapi ? (
                  <Badge variant="outline">Sim</Badge>
                ) : row.neverCreated ? (
                  <Badge variant="secondary">Não (nunca criada)</Badge>
                ) : (
                  <Badge variant="secondary">Não (removida)</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
