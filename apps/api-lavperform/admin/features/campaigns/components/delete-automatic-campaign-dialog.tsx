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

export function DeleteAutomaticCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  campaignName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  campaignName?: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mover para lixeira</AlertDialogTitle>
          <AlertDialogDescription>
            {campaignName ? (
              <>
                A campanha{" "}
                <span className="font-medium text-foreground">
                  {campaignName}
                </span>{" "}
                será marcada como excluída (soft delete). Você poderá restaurá-la
                depois. Campanhas excluídas não podem ser reprocessadas.
              </>
            ) : (
              "A campanha será marcada como excluída. Você poderá restaurá-la depois."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
