"use client"

import {
  KeyRoundIcon,
  Link2OffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserActionsMenu({
  onEdit,
  onChangePassword,
  onUnlink,
  onDelete,
}: {
  onEdit: () => void
  onChangePassword: () => void
  onUnlink: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Ações do usuário" />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Editar dados
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onChangePassword}>
          <KeyRoundIcon />
          Trocar senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onUnlink}>
          <Link2OffIcon />
          Desvincular da empresa
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Excluir usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
