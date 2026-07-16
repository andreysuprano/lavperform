"use client"

import Link from "next/link"
import {
  CheckCircle2Icon,
  ClockIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Company, CompanyStatus } from "../types"

export function CompanyActionsMenu({
  company,
  onChangeState,
  onDelete,
  align = "end",
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
  showViewDetails = true,
}: {
  company: Pick<Company, "id" | "state">
  onChangeState: (state: CompanyStatus) => void
  onDelete: () => void
  align?: "start" | "center" | "end"
  triggerVariant?: "ghost" | "outline" | "default"
  triggerSize?: "icon-sm" | "icon" | "sm" | "default"
  showViewDetails?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            aria-label="Ações"
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {showViewDetails && (
          <DropdownMenuItem
            render={<Link href={`/companies/${company.id}`} />}
            nativeButton={false}
          >
            <EyeIcon />
            Ver detalhes
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<Link href={`/companies/${company.id}/edit`} />}
          nativeButton={false}
        >
          <PencilIcon />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ClockIcon />
            Alterar status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuItem
              disabled={company.state === "ACTIVE"}
              onClick={() => onChangeState("ACTIVE")}
            >
              <CheckCircle2Icon />
              Ativar
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={company.state === "INACTIVE"}
              onClick={() => onChangeState("INACTIVE")}
            >
              <PauseCircleIcon />
              Inativar
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={company.state === "PENDING"}
              onClick={() => onChangeState("PENDING")}
            >
              <ClockIcon />
              Marcar pendente
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <TrashIcon />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
