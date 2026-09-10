"use client"

import { WhatsappInstancesSection } from "@/features/whatsapp/components/whatsapp-instances-section"

export default function WhatsappPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Instâncias ao vivo na UAZAPI e histórico interno de desconexões por
          empresa.
        </p>
      </div>

      <WhatsappInstancesSection />
    </div>
  )
}
