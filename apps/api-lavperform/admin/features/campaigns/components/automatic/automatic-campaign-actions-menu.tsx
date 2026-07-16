"use client"

import Link from "next/link"
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PowerIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TrashIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

import type { AutomaticCampaign, AutomaticCampaignStatus } from "../../types"
import { AUTOMATIC_CAMPAIGN_STATUS_VALUES } from "../../types"
import { AUTOMATIC_CAMPAIGN_STATUS_LABELS } from "../../utils"

export function AutomaticCampaignActionsMenu({
  campaign,
  onChangeStatus,
  onToggleActive,
  onReprocess,
  onDelete,
  onRestore,
  align = "end",
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
  showViewDetails = true,
}: {
  campaign: Pick<
    AutomaticCampaign,
    "id" | "status" | "active" | "deletedAt"
  >
  onChangeStatus: (status: AutomaticCampaignStatus) => void
  onToggleActive: () => void
  onReprocess: () => void
  onDelete: () => void
  onRestore: () => void
  align?: "start" | "center" | "end"
  triggerVariant?: "ghost" | "outline" | "default"
  triggerSize?: "icon-sm" | "icon" | "sm" | "default"
  showViewDetails?: boolean
}) {
  const isDeleted = Boolean(campaign.deletedAt)

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
      <DropdownMenuContent align={align} className="w-52">
        {showViewDetails && (
          <DropdownMenuItem
            render={
              <Link href={`/campaigns/automatic/${campaign.id}`} />
            }
            nativeButton={false}
          >
            <EyeIcon />
            Ver detalhes
          </DropdownMenuItem>
        )}
        {!isDeleted && (
          <>
            <DropdownMenuItem
              render={
                <Link href={`/campaigns/automatic/${campaign.id}/edit`} />
              }
              nativeButton={false}
            >
              <PencilIcon />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleActive}>
              <PowerIcon />
              {campaign.active ? "Desativar" : "Ativar"}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Alterar status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {AUTOMATIC_CAMPAIGN_STATUS_VALUES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={campaign.status === status}
                    onClick={() => onChangeStatus(status)}
                  >
                    {AUTOMATIC_CAMPAIGN_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onReprocess}>
              <RefreshCwIcon />
              Reprocessar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <TrashIcon />
              Mover para lixeira
            </DropdownMenuItem>
          </>
        )}
        {isDeleted && (
          <DropdownMenuItem onClick={onRestore}>
            <RotateCcwIcon />
            Restaurar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
