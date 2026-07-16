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

export function DeleteCompanyDialog({
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
          <AlertDialogTitle>Excluir empresa</AlertDialogTitle>
          <AlertDialogDescription>
            {companyName ? (
              <>
                Tem certeza que deseja excluir{" "}
                <span className="font-medium text-foreground">
                  {companyName}
                </span>
                ? Essa ação marca a empresa como excluída (soft delete).
                Usuários vinculados não conseguirão fazer login e a empresa deixará
                de aparecer nas listagens. Para pausar temporariamente, prefira
                inativar a empresa.
              </>
            ) : (
              <>
                Tem certeza que deseja excluir esta empresa? Ela será marcada
                como excluída e deixará de aparecer para todos os usuários.
              </>
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
