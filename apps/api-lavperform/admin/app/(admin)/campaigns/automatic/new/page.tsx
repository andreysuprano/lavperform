import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AutomaticCampaignCreateForm } from "@/features/campaigns/components/automatic/automatic-campaign-create-form"

export default function NewAutomaticCampaignPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/campaigns?tab=automatic" />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Nova campanha automática
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure uma campanha recorrente com criativos e brindes opcionais.
          </p>
        </div>
      </div>

      <AutomaticCampaignCreateForm />
    </div>
  )
}
