"use client"

import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function RotateTokenResultDialog({
  open,
  onOpenChange,
  token,
  onCopy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string | null
  onCopy: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo admin token gerado</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Copie o token abaixo e atualize a variável{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              UAZAPI_ADMIN_API_KEY
            </code>{" "}
            no servidor. Sem isso, os endpoints admin de WhatsApp deixarão de
            funcionar.
          </p>

          {token && (
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
              {token}
            </pre>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onCopy} disabled={!token}>
            <CopyIcon />
            Copiar token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
