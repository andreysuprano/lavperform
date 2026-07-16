"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import { SelectValueLookup, ALL_SELECT_VALUE } from "@/components/select-value-label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useCompanies } from "@/features/companies/companies-queries"

const ALL_VALUE = ALL_SELECT_VALUE

export function CompanySelect({
  id,
  value,
  onChange,
  placeholder = "Todas as empresas",
  allowAll = false,
  disabled,
}: {
  id?: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  allowAll?: boolean
  disabled?: boolean
}) {
  const { data, isLoading, error } = useCompanies({
    limit: 100,
    orderBy: "name",
    orderDirection: "asc",
  })

  const companies = data?.items ?? []
  const selectedValue = value ?? (allowAll ? ALL_VALUE : "")

  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  )

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
        Não foi possível carregar empresas: {error.message}
      </div>
    )
  }

  return (
    <Select
      value={selectedValue || undefined}
      onValueChange={(next) => {
        const resolved = typeof next === "string" ? next : ALL_VALUE
        if (allowAll && resolved === ALL_VALUE) {
          onChange(null)
          return
        }
        onChange(resolved)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando...
          </span>
        ) : (
          <SelectValueLookup
            placeholder={placeholder}
            emptyValues={allowAll ? [ALL_VALUE] : []}
            lookup={(idValue) => {
              if (idValue === ALL_VALUE) return placeholder
              return companyById.get(idValue)?.name
            }}
          />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {allowAll && <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>}
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
