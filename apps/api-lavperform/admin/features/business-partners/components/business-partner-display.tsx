"use client"

import { useBusinessPartner } from "../business-partners-queries"

export function BusinessPartnerDisplay({
  partnerId,
  fallback = "—",
}: {
  partnerId: string | null | undefined
  fallback?: string
}) {
  const { data, isLoading } = useBusinessPartner(partnerId ?? null)

  if (!partnerId) return <span>{fallback}</span>
  if (isLoading) return <span className="text-muted-foreground">Carregando…</span>
  if (!data) {
    return (
      <span className="font-mono text-xs text-muted-foreground">
        {partnerId}
      </span>
    )
  }

  return (
    <div className="flex flex-col">
      <span className="text-sm text-foreground">{data.name}</span>
      <span className="text-xs text-muted-foreground">
        {data.email}
        {data.cnpj ? ` · ${data.cnpj}` : ""}
      </span>
    </div>
  )
}
