"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { SelectValueLabel } from "@/components/select-value-label"

import { ADMIN_ROLE_OPTIONS } from "../roles"
import type { AdministratorListParams } from "../types"

type FilterValues = Pick<
  AdministratorListParams,
  "name" | "email" | "role" | "isActive"
>

const ACTIVE_LABELS = {
  all: "Todos",
  true: "Ativos",
  false: "Inativos",
} as const

export function AdministratorsFilters({
  values,
  onChange,
  onClear,
}: {
  values: FilterValues
  onChange: (next: FilterValues) => void
  onClear: () => void
}) {
  const activeValue =
    values.isActive === undefined
      ? "all"
      : values.isActive
        ? "true"
        : "false"

  const hasFilters = Boolean(
    values.name || values.email || values.role || values.isActive !== undefined
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome"
            value={values.name ?? ""}
            onChange={(event) =>
              onChange({ ...values, name: event.target.value || undefined })
            }
            className="pl-8"
          />
        </div>
        <Input
          placeholder="Buscar por e-mail"
          value={values.email ?? ""}
          onChange={(event) =>
            onChange({ ...values, email: event.target.value || undefined })
          }
        />
        <Select
          value={values.role ?? "all"}
          onValueChange={(value) => {
            onChange({
              ...values,
              role: value === "all" ? undefined : (value as FilterValues["role"]),
            })
          }}
        >
          <SelectTrigger>
            <SelectValueLabel
              labels={{
                all: "Todos os tipos",
                ...Object.fromEntries(
                  ADMIN_ROLE_OPTIONS.map((option) => [option.value, option.label])
                ),
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ADMIN_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={activeValue}
          onValueChange={(value) => {
            onChange({
              ...values,
              isActive:
                value === "all" ? undefined : value === "true",
            })
          }}
        >
          <SelectTrigger>
            <SelectValueLabel labels={ACTIVE_LABELS} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <XIcon />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
