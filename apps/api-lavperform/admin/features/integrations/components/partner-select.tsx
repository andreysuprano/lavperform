"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useIntegrationPartners } from "../integrations-queries"
import { partnerSlugLabel } from "../utils"

export function PartnerSelect({
  id,
  value,
  onChange,
  placeholder = "Selecione o integrador",
  disabled,
  excludePartnerIds = [],
}: {
  id?: string
  value: string | null | undefined
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  excludePartnerIds?: string[]
}) {
  const { data, isLoading, error } = useIntegrationPartners()

  const partners = useMemo(() => {
    const list = data ?? []
    if (excludePartnerIds.length === 0) return list
    const excluded = new Set(excludePartnerIds)
    return list.filter((partner) => !excluded.has(partner.id))
  }, [data, excludePartnerIds])

  const partnerById = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner])),
    [partners]
  )

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
        Não foi possível carregar integradores: {error.message}
      </div>
    )
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => {
        if (typeof next === "string" && next.length > 0) onChange(next)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando integradores...
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>
            {(current) => {
              const idValue = typeof current === "string" ? current : ""
              if (!idValue) {
                return (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              }
              const partner = partnerById.get(idValue)
              return partner?.name ?? placeholder
            }}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {partners.length === 0 && !isLoading && (
            <SelectItem value="__empty__" disabled>
              Nenhum integrador disponível
            </SelectItem>
          )}
          {partners.map((partner) => (
            <SelectItem key={partner.id} value={partner.id}>
              <div className="flex flex-col">
                <span className="font-medium">{partner.name}</span>
                <span className="text-xs text-muted-foreground">
                  {partnerSlugLabel(partner.partnerSlug)}
                  {!partner.supportsImportHistory ? " · sem import histórico" : ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
