"use client"

import {
  HistoryIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
  PlayCircleIcon,
  TrashIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { CompanyIntegration, IntegrationPartner } from "../types"

export function IntegrationActionsMenu({
  integration,
  partner,
  onEdit,
  onToggleActive,
  onImportHistory,
  onDelete,
}: {
  integration: CompanyIntegration
  partner: IntegrationPartner | null
  onEdit: () => void
  onToggleActive: () => void
  onImportHistory: () => void
  onDelete: () => void
}) {
  const supportsImport = partner?.supportsImportHistory ?? false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Ações da integração" />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Editar credenciais
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onToggleActive}>
          {integration.active ? (
            <>
              <PauseCircleIcon />
              Desativar
            </>
          ) : (
            <>
              <PlayCircleIcon />
              Ativar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onImportHistory}
          disabled={!supportsImport}
        >
          <HistoryIcon />
          Importar histórico
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <TrashIcon />
          Remover
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
