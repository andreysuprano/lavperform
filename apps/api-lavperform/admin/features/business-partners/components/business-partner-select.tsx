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

import { useBusinessPartners } from "../business-partners-queries"

const NONE_VALUE = "__none__"

export function BusinessPartnerSelect({
  id,
  value,
  onChange,
  placeholder = "Nenhum parceiro",
  disabled,
}: {
  id?: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
}) {
  const { data, isLoading, error } = useBusinessPartners()

  const partners = data ?? []
  const hasPartners = partners.length > 0
  const selectedValue = value ?? NONE_VALUE

  const partnerById = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner])),
    [partners]
  )

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
        Não foi possível carregar os parceiros: {error.message}
      </div>
    )
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={(next) => {
        const resolved = typeof next === "string" ? next : NONE_VALUE
        onChange(resolved === NONE_VALUE ? null : resolved)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando parceiros...
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>
            {(current) => {
              const idValue =
                typeof current === "string" ? current : NONE_VALUE
              if (!idValue || idValue === NONE_VALUE) {
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
          <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
          {!hasPartners && !isLoading && (
            <SelectItem value="__empty__" disabled>
              Nenhum parceiro cadastrado
            </SelectItem>
          )}
          {partners.map((partner) => (
            <SelectItem key={partner.id} value={partner.id}>
              <div className="flex flex-col">
                <span className="font-medium">{partner.name}</span>
                <span className="text-xs text-muted-foreground">
                  {partner.email}
                  {partner.cnpj ? ` · ${partner.cnpj}` : ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
