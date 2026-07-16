"use client"

import { use } from "react"

import { CampaignMessagesPage } from "@/features/campaigns/components/messages/campaign-messages-page"

export default function ScheduledCampaignMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <CampaignMessagesPage campaignId={id} variant="scheduled" />
    </div>
  )
}
