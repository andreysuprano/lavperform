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

export function DeleteCustomerBaseDialog({
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
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir base de clientes</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {companyName ? (
              <>
                Excluir a base de clientes de{" "}
                <span className="font-medium text-foreground">
                  {companyName}
                </span>
                ? Esta ação não pode ser desfeita.
              </>
            ) : (
              "Excluir a base de clientes desta empresa? Esta ação não pode ser desfeita."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-left text-sm text-muted-foreground">
          <li>Apaga todos os clientes e os endereços deles.</li>
          <li>Cancela envios que ainda não saíram.</li>
          <li>Os pedidos continuam, sem o cliente ligado.</li>
          <li>Mensagens já enviadas continuam no histórico.</li>
          <li>As campanhas da empresa continuam ativas.</li>
        </ul>
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
              "Excluir base"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
