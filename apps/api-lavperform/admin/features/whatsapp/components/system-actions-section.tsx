"use client"

import { useState } from "react"
import { KeyRoundIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmActionDialog } from "@/features/billing/components/shared/confirm-action-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { RotateTokenResultDialog } from "./rotate-token-result-dialog"
import {
  useRestartWhatsappApplication,
  useRotateWhatsappAdminToken,
} from "../whatsapp-queries"

export function SystemActionsSection() {
  const restartMutation = useRestartWhatsappApplication()
  const rotateMutation = useRotateWhatsappAdminToken()

  const [restartOpen, setRestartOpen] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)

  function handleRestart() {
    restartMutation.mutate(undefined, {
      onSuccess: () => setRestartOpen(false),
    })
  }

  function handleRotate() {
    rotateMutation.mutate(undefined, {
      onSuccess: (result) => {
        setRotateOpen(false)
        setNewToken(result.token)
        setTokenDialogOpen(true)
      },
    })
  }

  async function copyToken() {
    if (!newToken) return
    try {
      await navigator.clipboard.writeText(newToken)
      toast.success("Token copiado")
    } catch {
      toast.error("Não foi possível copiar o token")
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Operações de sistema</CardTitle>
          <CardDescription>
            Ações destrutivas no servidor UAZAPI. Use apenas em manutenção
            programada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Reiniciar aplicação</p>
              <p className="text-sm text-muted-foreground">
                Desconecta e reconecta todas as instâncias temporariamente.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setRestartOpen(true)}
              disabled={restartMutation.isPending}
            >
              <RotateCcwIcon />
              Reiniciar UAZAPI
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Rotacionar admin token</p>
              <p className="text-sm text-muted-foreground">
                Invalida o token atual. Atualize UAZAPI_ADMIN_API_KEY no servidor
                imediatamente após rotacionar.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setRotateOpen(true)}
              disabled={rotateMutation.isPending}
            >
              <KeyRoundIcon />
              Rotacionar token
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={restartOpen}
        onOpenChange={setRestartOpen}
        onConfirm={handleRestart}
        isPending={restartMutation.isPending}
        title="Reiniciar servidor UAZAPI?"
        description="Todas as instâncias ficarão temporariamente offline enquanto a aplicação reinicia. Confirme apenas se estiver em janela de manutenção."
        confirmLabel="Reiniciar"
        destructive
      />

      <ConfirmActionDialog
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onConfirm={handleRotate}
        isPending={rotateMutation.isPending}
        title="Rotacionar admin token?"
        description="O token administrativo atual será invalidado. Você precisará atualizar a variável UAZAPI_ADMIN_API_KEY no ambiente do backend com o novo valor retornado."
        confirmLabel="Rotacionar"
        destructive
      />

      <RotateTokenResultDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        token={newToken}
        onCopy={copyToken}
      />
    </>
  )
}
