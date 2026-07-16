"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription } from "@/components/ui/field"

export function GenerateConnectionLinkDialog({
  open,
  onOpenChange,
  companyName,
  hasExistingInstance,
  isPending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  hasExistingInstance: boolean
  isPending: boolean
  onSubmit: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar link de conexão</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldDescription className="text-sm text-foreground">
            {hasExistingInstance ? (
              <>
                Será gerado um link público para <strong>{companyName}</strong>{" "}
                conectar a instância WhatsApp já vinculada. Links ativos anteriores
                serão revogados automaticamente.
              </>
            ) : (
              <>
                <strong>{companyName}</strong> ainda não possui instância WhatsApp.
                Ao continuar, uma nova instância será criada na UAZAPI com token
                gerado automaticamente, vinculada à empresa, e em seguida o link
                público de conexão será gerado.
              </>
            )}
          </FieldDescription>
        </Field>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {hasExistingInstance ? "Gerando..." : "Criando instância..."}
              </>
            ) : hasExistingInstance ? (
              "Gerar e copiar link"
            ) : (
              "Criar instância e gerar link"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
