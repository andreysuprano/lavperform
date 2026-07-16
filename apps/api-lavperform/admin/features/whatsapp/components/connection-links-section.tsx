"use client"

import { useState } from "react"
import { CopyIcon, Link2OffIcon, Loader2, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmActionDialog } from "@/features/billing/components/shared/confirm-action-dialog"
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

import { GenerateConnectionLinkDialog } from "./generate-connection-link-dialog"
import { formatDate, resolveConnectionLinkUrl } from "../utils"
import {
  useConnectionLinks,
  useCreateConnectionLink,
  useRevokeConnectionLink,
} from "../whatsapp-queries"
import type { WhatsappConnectionLink } from "../types"

export function ConnectionLinksSection({
  companyId,
  companyName,
  hasExistingInstance = false,
}: {
  companyId: string
  companyName: string
  hasExistingInstance?: boolean
}) {
  const linksQuery = useConnectionLinks(companyId)
  const createMutation = useCreateConnectionLink(companyId)
  const revokeMutation = useRevokeConnectionLink(companyId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<WhatsappConnectionLink | null>(
    null
  )

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(resolveConnectionLinkUrl(url))
      toast.success("Link copiado")
    } catch {
      toast.error("Não foi possível copiar o link")
    }
  }

  function handleRevoke() {
    if (!revokeTarget) return
    revokeMutation.mutate(revokeTarget.id, {
      onSuccess: () => setRevokeTarget(null),
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Link público de conexão</CardTitle>
            <CardDescription>
              Gere um link para {companyName} conectar o WhatsApp sem acessar o
              painel admin. O link expira em 7 dias.
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon />
            Gerar link
          </Button>
        </CardHeader>
        <CardContent>
          {linksQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando links...
            </div>
          ) : linksQuery.error ? (
            <p className="text-sm text-destructive">
              {(linksQuery.error as Error).message}
            </p>
          ) : (linksQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum link gerado ainda. Crie um link e envie para o cliente.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Instância</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-28">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(linksQuery.data ?? []).map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <LinkStatusBadge link={link} />
                      </TableCell>
                      <TableCell>{link.whatsappInstance?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(link.expiresAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(link.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {link.isActive && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyLink(link.url)}
                              title="Copiar link"
                            >
                              <CopyIcon className="size-4" />
                            </Button>
                          )}
                          {link.isActive && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setRevokeTarget(link)}
                              title="Revogar link"
                            >
                              <Link2OffIcon className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateConnectionLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyName={companyName}
        hasExistingInstance={hasExistingInstance}
        isPending={createMutation.isPending}
        onSubmit={() => {
          createMutation.mutate(undefined, {
            onSuccess: (link) => {
              setDialogOpen(false)
              copyLink(link.url)
            },
          })
        }}
      />

      <ConfirmActionDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
        onConfirm={handleRevoke}
        isPending={revokeMutation.isPending}
        title="Revogar link de conexão?"
        description="O cliente não conseguirá mais usar este link para conectar o WhatsApp."
        confirmLabel="Revogar"
        destructive
      />
    </>
  )
}

function LinkStatusBadge({ link }: { link: WhatsappConnectionLink }) {
  if (link.revokedAt) {
    return <Badge variant="secondary">Revogado</Badge>
  }
  if (link.isActive) {
    return <Badge variant="default">Ativo</Badge>
  }
  return <Badge variant="outline">Expirado</Badge>
}
