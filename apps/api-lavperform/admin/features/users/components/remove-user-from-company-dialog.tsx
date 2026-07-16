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

export function RemoveUserFromCompanyDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  userName,
  mode = "unlink",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
  userName?: string
  mode?: "unlink" | "delete"
}) {
  const title =
    mode === "delete" ? "Excluir usuário" : "Desvincular usuário da empresa"
  const confirmLabel =
    mode === "delete"
      ? isPending
        ? "Excluindo..."
        : "Excluir usuário"
      : isPending
        ? "Desvinculando..."
        : "Desvincular"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "delete" ? (
              <>
                Tem certeza que deseja excluir o usuário
                {userName ? (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">
                      {userName}
                    </span>
                  </>
                ) : null}
                ? Essa ação remove o usuário de todas as empresas e não pode ser
                desfeita.
              </>
            ) : (
              <>
                Tem certeza que deseja desvincular{" "}
                {userName ? (
                  <span className="font-medium text-foreground">
                    {userName}
                  </span>
                ) : (
                  "este usuário"
                )}{" "}
                desta empresa? O usuário continuará existindo na plataforma e
                poderá ser vinculado novamente.
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
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
