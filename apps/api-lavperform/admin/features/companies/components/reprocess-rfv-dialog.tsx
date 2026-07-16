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

export function ReprocessRfvDialog({
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
          <AlertDialogTitle>Reprocessar análise RFV</AlertDialogTitle>
          <AlertDialogDescription>
            {companyName ? (
              <>
                Recalcular a classificação RFV de todos os clientes de{" "}
                <span className="font-medium text-foreground">
                  {companyName}
                </span>
                ? O processamento roda em fila e pode levar alguns minutos
                dependendo do tamanho da base.
              </>
            ) : (
              "Recalcular a classificação RFV de todos os clientes desta empresa? O processamento roda em fila e pode levar alguns minutos dependendo do tamanho da base."
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
              "Reprocessar RFV"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
