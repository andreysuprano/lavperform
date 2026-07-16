"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AutomaticCampaignEditForm } from "@/features/campaigns/components/automatic/automatic-campaign-edit-form"

export default function EditAutomaticCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/campaigns/automatic/${id}`} />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Editar campanha automática
          </h2>
          <p className="text-sm text-muted-foreground">
            Atualize os dados da campanha automática.
          </p>
        </div>
      </div>

      <AutomaticCampaignEditForm campaignId={id} />
    </div>
  )
}
