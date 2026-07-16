"use client"

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

import type { WebhookErrorEntry } from "../types"
import { formatDate } from "../utils"
import { useGlobalWebhookErrors } from "../whatsapp-queries"

export function WebhookErrorsTable() {
  const errorsQuery = useGlobalWebhookErrors()

  const errors = normalizeErrors(errorsQuery.data)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Erros recentes do webhook</CardTitle>
        <CardDescription>
          Últimas falhas de entrega registradas pela UAZAPI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando erros...</p>
        ) : errorsQuery.error ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">
              {(errorsQuery.error as Error).message}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => errorsQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum erro registrado recentemente.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.map((entry, index) => (
                  <TableRow key={`${entry.timestamp ?? index}-${index}`}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.timestamp)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {entry.url ?? "—"}
                    </TableCell>
                    <TableCell>{entry.statusCode ?? "—"}</TableCell>
                    <TableCell className="text-destructive">
                      {entry.error ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function normalizeErrors(data: unknown): WebhookErrorEntry[] {
  if (Array.isArray(data)) return data as WebhookErrorEntry[]
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.errors)) {
      return record.errors as WebhookErrorEntry[]
    }
  }
  return []
}
