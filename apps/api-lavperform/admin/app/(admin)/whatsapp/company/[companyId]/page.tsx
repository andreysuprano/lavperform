"use client"

import { use } from "react"

import { CompanyWhatsappView } from "@/features/whatsapp/components/company-whatsapp-view"

export default function CompanyWhatsappPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <CompanyWhatsappView companyId={companyId} />
    </div>
  )
}
