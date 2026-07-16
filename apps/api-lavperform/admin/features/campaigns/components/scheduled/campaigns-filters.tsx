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

import type { CampaignChannel, CampaignListParams, CampaignStatus } from "../../types"
import {
  CAMPAIGN_CHANNEL_VALUES,
  CAMPAIGN_STATUS_VALUES,
} from "../../types"
import {
  CAMPAIGN_STATUS_LABELS,
  CHANNEL_LABELS,
} from "../../utils"
import { CompanySelect } from "../company-select"

const ALL_VALUE = ALL_SELECT_VALUE

type Filters = Pick<
  CampaignListParams,
  | "companyId"
  | "name"
  | "status"
  | "channel"
  | "modifiedByAI"
  | "startDate"
  | "endDate"
  | "trakingCode"
>

export function CampaignsFilters({
  values,
  onChange,
  onClear,
}: {
  values: Filters
  onChange: (next: Filters) => void
  onClear: () => void
}) {
  const [nameInput, setNameInput] = useState(values.name ?? "")
  const [trackingInput, setTrackingInput] = useState(values.trakingCode ?? "")

  useEffect(() => {
    setNameInput(values.name ?? "")
  }, [values.name])

  useEffect(() => {
    setTrackingInput(values.trakingCode ?? "")
  }, [values.trakingCode])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.name ?? "") === nameInput) return
      onChange({ ...values, name: nameInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [nameInput, values, onChange])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.trakingCode ?? "") === trackingInput) return
      onChange({ ...values, trakingCode: trackingInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [trackingInput, values, onChange])

  const hasFilters = Boolean(
    values.companyId ||
      values.name ||
      values.status ||
      values.channel ||
      values.modifiedByAI !== undefined ||
      values.startDate ||
      values.endDate ||
      values.trakingCode
  )

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <Field className="md:w-56">
        <FieldLabel htmlFor="filter-campaign-name">Buscar por nome</FieldLabel>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-campaign-name"
            value={nameInput}
            placeholder="Nome da campanha"
            className="pl-7"
            onChange={(event) => setNameInput(event.target.value)}
          />
        </div>
      </Field>

      <Field className="md:w-52">
        <FieldLabel htmlFor="filter-company">Empresa</FieldLabel>
        <CompanySelect
          id="filter-company"
          value={values.companyId ?? null}
          onChange={(companyId) =>
            onChange({ ...values, companyId: companyId ?? undefined })
          }
          allowAll
          placeholder="Todas as empresas"
        />
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-status">Status</FieldLabel>
        <Select
          value={values.status ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              status:
                next === ALL_VALUE ? undefined : (next as CampaignStatus),
            })
          }}
        >
          <SelectTrigger id="filter-status" className="w-full">
            <SelectValueLabel
              labels={{
                ...CAMPAIGN_STATUS_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {CAMPAIGN_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CAMPAIGN_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-48">
        <FieldLabel htmlFor="filter-channel">Canal</FieldLabel>
        <Select
          value={values.channel ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              channel:
                next === ALL_VALUE ? undefined : (next as CampaignChannel),
            })
          }}
        >
          <SelectTrigger id="filter-channel" className="w-full">
            <SelectValueLabel
              labels={{
                ...CHANNEL_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {CAMPAIGN_CHANNEL_VALUES.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-40">
        <FieldLabel htmlFor="filter-ai">Modificada por IA</FieldLabel>
        <Select
          value={
            values.modifiedByAI === undefined
              ? ALL_VALUE
              : values.modifiedByAI
                ? "true"
                : "false"
          }
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              modifiedByAI:
                next === ALL_VALUE ? undefined : next === "true",
            })
          }}
        >
          <SelectTrigger id="filter-ai" className="w-full">
            <SelectValueLabel
              labels={{
                ...BOOLEAN_FILTER_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-start">Agendada de</FieldLabel>
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
        <FieldLabel htmlFor="filter-end">Agendada até</FieldLabel>
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

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-tracking">Código rastreio</FieldLabel>
        <Input
          id="filter-tracking"
          value={trackingInput}
          placeholder="BF2026"
          onChange={(event) => setTrackingInput(event.target.value)}
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
