"use client"

import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import {
  ALL_FILTER_LABEL,
  ALL_SELECT_VALUE,
  SelectValueLabel,
} from "@/components/select-value-label"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import type { InstanceListFilters, UazapiInstanceStatus } from "../types"
import { UAZAPI_STATUS_LABELS } from "../utils"

const ALL_VALUE = ALL_SELECT_VALUE

const LINKED_LABELS = {
  all: "Todas",
  linked: "Vinculadas",
  orphan: "Órfãs",
} as const

export function InstancesFilters({
  values,
  onChange,
  onClear,
}: {
  values: InstanceListFilters
  onChange: (next: InstanceListFilters) => void
  onClear: () => void
}) {
  const [searchInput, setSearchInput] = useState(values.search ?? "")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com filtros externos
    setSearchInput(values.search ?? "")
  }, [values.search])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.search ?? "") === searchInput) return
      onChange({ ...values, search: searchInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput, values, onChange])

  const hasFilters = Boolean(values.search || values.status || values.linked)

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <Field className="md:w-72">
        <FieldLabel htmlFor="filter-instance-search">Buscar</FieldLabel>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-instance-search"
            value={searchInput}
            placeholder="Nome, empresa ou token"
            className="pl-7"
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </Field>

      <Field className="md:w-48">
        <FieldLabel htmlFor="filter-instance-status">Status UAZAPI</FieldLabel>
        <Select
          value={values.status ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              status:
                next === ALL_VALUE ? undefined : (next as UazapiInstanceStatus),
            })
          }}
        >
          <SelectTrigger id="filter-instance-status" className="w-full">
            <SelectValueLabel
              labels={{
                ...UAZAPI_STATUS_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {Object.entries(UAZAPI_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-instance-linked">Vínculo</FieldLabel>
        <Select
          value={values.linked ?? "all"}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : "all"
            onChange({
              ...values,
              linked:
                next === "all" ? undefined : (next as "linked" | "orphan"),
            })
          }}
        >
          <SelectTrigger id="filter-instance-linked" className="w-full">
            <SelectValueLabel
              labels={LINKED_LABELS}
              placeholder={LINKED_LABELS.all}
              emptyValues={["all"]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{LINKED_LABELS.all}</SelectItem>
              <SelectItem value="linked">{LINKED_LABELS.linked}</SelectItem>
              <SelectItem value="orphan">{LINKED_LABELS.orphan}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="md:mb-0.5"
        >
          <XIcon />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
