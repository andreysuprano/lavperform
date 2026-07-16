"use client"

import { use } from "react"

import { CompanyApiKeysView } from "@/features/api-keys/components/company-api-keys-view"

export default function CompanyApiKeysPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <CompanyApiKeysView companyId={id} />
    </div>
  )
}
