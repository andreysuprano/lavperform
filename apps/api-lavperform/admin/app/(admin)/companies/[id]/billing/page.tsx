"use client"

import { use } from "react"

import { CompanyBillingView } from "@/features/billing/components/company-billing-view"

export default function CompanyBillingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <CompanyBillingView companyId={id} />
    </div>
  )
}
