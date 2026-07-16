"use client"

import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function RevalidateWhatsappDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  companyName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  companyName?: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revalidar WhatsApp dos clientes</AlertDialogTitle>
          <AlertDialogDescription>
            {companyName ? (
              <>
                Enfileirar a revalidação de WhatsApp para todos os clientes de{" "}
                <span className="font-medium text-foreground">
                  {companyName}
                </span>
                ? Os telefones serão verificados novamente na fila de validação.
              </>
            ) : (
              "Enfileirar a revalidação de WhatsApp para todos os clientes desta empresa? Os telefones serão verificados novamente na fila de validação."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Enfileirando...
              </>
            ) : (
              "Revalidar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
