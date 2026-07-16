import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampaignCreateForm } from "@/features/campaigns/components/scheduled/campaign-create-form"

export default function NewCampaignPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/campaigns?tab=scheduled" />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Nova campanha agendada
          </h2>
          <p className="text-sm text-muted-foreground">
            Crie uma campanha com data e hora de envio definidas.
          </p>
        </div>
      </div>

      <CampaignCreateForm />
    </div>
  )
}
