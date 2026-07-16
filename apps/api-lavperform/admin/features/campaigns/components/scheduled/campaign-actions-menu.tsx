"use client"

import Link from "next/link"
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  TrashIcon,
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

import type { Campaign, CampaignStatus } from "../../types"
import { CAMPAIGN_STATUS_VALUES } from "../../types"
import { CAMPAIGN_STATUS_LABELS } from "../../utils"
import { CampaignStatusBadge } from "../campaign-status-badge"

export function CampaignActionsMenu({
  campaign,
  onChangeStatus,
  onReprocess,
  onDelete,
  align = "end",
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
  showViewDetails = true,
}: {
  campaign: Pick<Campaign, "id" | "status">
  onChangeStatus: (status: CampaignStatus) => void
  onReprocess: () => void
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
      <DropdownMenuContent align={align} className="w-52">
        {showViewDetails && (
          <DropdownMenuItem
            render={<Link href={`/campaigns/${campaign.id}`} />}
            nativeButton={false}
          >
            <EyeIcon />
            Ver detalhes
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<Link href={`/campaigns/${campaign.id}/edit`} />}
          nativeButton={false}
        >
          <PencilIcon />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Alterar status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {CAMPAIGN_STATUS_VALUES.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={campaign.status === status}
                onClick={() => onChangeStatus(status)}
              >
                {CAMPAIGN_STATUS_LABELS[status]}
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
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
