"use client"

import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ALL_FILTER_LABEL,
  ALL_SELECT_VALUE,
  BOOLEAN_FILTER_LABELS,
  SelectValueLabel,
} from "@/components/select-value-label"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import { COMPANY_STATUS_LABELS } from "../utils"
import type { CompanyListParams, CompanyStatus } from "../types"

const ALL_VALUE = ALL_SELECT_VALUE

type Filters = Pick<
  CompanyListParams,
  "name" | "state" | "startDate" | "endDate"
>

export function CompaniesFilters({
  values,
  onChange,
  onClear,
}: {
  values: Filters
  onChange: (next: Filters) => void
  onClear: () => void
}) {
  const [nameInput, setNameInput] = useState(values.name ?? "")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a URL quando filtros mudam externamente
    setNameInput(values.name ?? "")
  }, [values.name])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.name ?? "") === nameInput) return
      onChange({ ...values, name: nameInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [nameInput, values, onChange])

  const hasFilters = Boolean(
    values.name || values.state || values.startDate || values.endDate
  )

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <Field className="md:w-72">
        <FieldLabel htmlFor="filter-name">Buscar por nome</FieldLabel>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-name"
            value={nameInput}
            placeholder="Nome da empresa"
            className="pl-7"
            onChange={(event) => setNameInput(event.target.value)}
          />
        </div>
      </Field>

      <Field className="md:w-48">
        <FieldLabel htmlFor="filter-state">Status</FieldLabel>
        <Select
          value={values.state ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              state:
                next === ALL_VALUE ? undefined : (next as CompanyStatus),
            })
          }}
        >
          <SelectTrigger id="filter-state" className="w-full">
            <SelectValueLabel
              labels={{
                ...COMPANY_STATUS_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              <SelectItem value="ACTIVE">
                {COMPANY_STATUS_LABELS.ACTIVE}
              </SelectItem>
              <SelectItem value="INACTIVE">
                {COMPANY_STATUS_LABELS.INACTIVE}
              </SelectItem>
              <SelectItem value="PENDING">
                {COMPANY_STATUS_LABELS.PENDING}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-start">Início</FieldLabel>
        <Input
          id="filter-start"
          type="date"
          value={values.startDate?.slice(0, 10) ?? ""}
          onChange={(event) =>
            onChange({
              ...values,
              startDate: event.target.value
                ? new Date(event.target.value).toISOString()
                : undefined,
            })
          }
        />
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-end">Fim</FieldLabel>
        <Input
          id="filter-end"
          type="date"
          value={values.endDate?.slice(0, 10) ?? ""}
          onChange={(event) =>
            onChange({
              ...values,
              endDate: event.target.value
                ? new Date(event.target.value).toISOString()
                : undefined,
            })
          }
        />
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
