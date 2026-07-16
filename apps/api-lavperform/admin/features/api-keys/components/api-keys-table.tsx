"use client"

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

import type { PublicApiKey } from "../types"
import { ApiKeyStatusBadge, formatApiKeyDate } from "../utils"

export function ApiKeysTable({
  apiKeys,
  isLoading,
  error,
  onRetry,
  onRevoke,
  onDelete,
  isRevoking,
  isDeleting,
}: {
  apiKeys: PublicApiKey[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onRevoke: (apiKey: PublicApiKey) => void
  onDelete: (apiKey: PublicApiKey) => void
  isRevoking: boolean
  isDeleting: boolean
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Carregando API keys...
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

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Nenhuma API key configurada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie uma chave para permitir que sistemas externos ingiram pedidos via
          Public API.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Prefixo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Último uso</TableHead>
            <TableHead>Criada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell className="font-medium">{apiKey.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {apiKey.prefix}
                </Badge>
              </TableCell>
              <TableCell>
                <ApiKeyStatusBadge status={apiKey.status} />
              </TableCell>
              <TableCell>{formatApiKeyDate(apiKey.lastUsedAt)}</TableCell>
              <TableCell>{formatApiKeyDate(apiKey.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {apiKey.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRevoking}
                      onClick={() => onRevoke(apiKey)}
                    >
                      Revogar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => onDelete(apiKey)}
                  >
                    Excluir
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
