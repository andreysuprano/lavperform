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

export function ReprocessCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  campaignName,
  variant,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  campaignName?: string
  variant: "scheduled" | "automatic"
}) {
  const description =
    variant === "scheduled"
      ? "Mensagens pendentes ou em processamento serão removidas. O status da campanha voltará para Aguardando e ela será reenfileirada."
      : "Mensagens pendentes ou em processamento serão abortadas. A campanha será reenfileirada sem alterar o status."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reprocessar campanha</AlertDialogTitle>
          <AlertDialogDescription>
            {campaignName ? (
              <>
                Reprocessar{" "}
                <span className="font-medium text-foreground">
                  {campaignName}
                </span>
                ? {description}
              </>
            ) : (
              description
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
                Reprocessando...
              </>
            ) : (
              "Reprocessar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
