import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { ErrorMessageSample } from "../types"
import { formatDate } from "../utils"
import { ChannelBadge } from "./channel-badge"
import { MessageStatusBadge } from "./message-status-badge"

export function ErrorMessagesTable({
  messages,
  emptyMessage = "Nenhum erro recente.",
}: {
  messages: ErrorMessageSample[] | undefined
  emptyMessage?: string
}) {
  const rows = messages ?? []

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Telefone</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead>Erro</TableHead>
            <TableHead>Atualizado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((message) => (
            <TableRow key={message.id}>
              <TableCell className="font-mono text-xs">
                {message.phone}
              </TableCell>
              <TableCell>{message.customerName ?? "—"}</TableCell>
              <TableCell>
                <MessageStatusBadge status={message.status} />
              </TableCell>
              <TableCell>
                <ChannelBadge channel={message.channel} />
              </TableCell>
              <TableCell>{message.attempts}</TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {message.error ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(message.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
