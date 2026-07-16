"use client"

import { use } from "react"

import { CampaignDetailView } from "@/features/campaigns/components/scheduled/campaign-detail-view"

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <CampaignDetailView campaignId={id} />
    </div>
  )
}
