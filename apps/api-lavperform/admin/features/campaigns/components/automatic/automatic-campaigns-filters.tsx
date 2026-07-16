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

import type {
  AutomaticCampaignListParams,
  AutomaticCampaignStatus,
  AutomaticCampaignType,
  CampaignChannel,
} from "../../types"
import {
  AUTOMATIC_CAMPAIGN_STATUS_VALUES,
  AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  CAMPAIGN_CHANNEL_VALUES,
} from "../../types"
import {
  AUTOMATIC_CAMPAIGN_STATUS_LABELS,
  AUTOMATIC_CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
} from "../../utils"
import { CompanySelect } from "../company-select"

const ALL_VALUE = ALL_SELECT_VALUE

type Filters = Pick<
  AutomaticCampaignListParams,
  | "companyId"
  | "name"
  | "type"
  | "status"
  | "channel"
  | "active"
  | "startDate"
  | "endDate"
  | "deleted"
>

export function AutomaticCampaignsFilters({
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
    values.companyId ||
      values.name ||
      values.type ||
      values.status ||
      values.channel ||
      values.active !== undefined ||
      values.startDate ||
      values.endDate ||
      values.deleted
  )

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <Field className="md:w-56">
        <FieldLabel htmlFor="filter-auto-name">Buscar por nome</FieldLabel>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-auto-name"
            value={nameInput}
            placeholder="Nome da campanha"
            className="pl-7"
            onChange={(event) => setNameInput(event.target.value)}
          />
        </div>
      </Field>

      <Field className="md:w-52">
        <FieldLabel htmlFor="filter-auto-company">Empresa</FieldLabel>
        <CompanySelect
          id="filter-auto-company"
          value={values.companyId ?? null}
          onChange={(companyId) =>
            onChange({ ...values, companyId: companyId ?? undefined })
          }
          allowAll
          placeholder="Todas as empresas"
        />
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-type">Tipo</FieldLabel>
        <Select
          value={values.type ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              type:
                next === ALL_VALUE
                  ? undefined
                  : (next as AutomaticCampaignType),
            })
          }}
        >
          <SelectTrigger id="filter-type" className="w-full">
            <SelectValueLabel
              labels={{
                ...AUTOMATIC_CAMPAIGN_TYPE_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {AUTOMATIC_CAMPAIGN_TYPE_VALUES.map((type) => (
                <SelectItem key={type} value={type}>
                  {AUTOMATIC_CAMPAIGN_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-auto-status">Status</FieldLabel>
        <Select
          value={values.status ?? ALL_VALUE}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              status:
                next === ALL_VALUE
                  ? undefined
                  : (next as AutomaticCampaignStatus),
            })
          }}
        >
          <SelectTrigger id="filter-auto-status" className="w-full">
            <SelectValueLabel
              labels={{
                ...AUTOMATIC_CAMPAIGN_STATUS_LABELS,
                [ALL_VALUE]: ALL_FILTER_LABEL,
              }}
              placeholder={ALL_FILTER_LABEL}
              emptyValues={[ALL_VALUE]}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {AUTOMATIC_CAMPAIGN_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {AUTOMATIC_CAMPAIGN_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-48">
        <FieldLabel htmlFor="filter-auto-channel">Canal</FieldLabel>
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
          <SelectTrigger id="filter-auto-channel" className="w-full">
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

      <Field className="md:w-36">
        <FieldLabel htmlFor="filter-active">Ativa</FieldLabel>
        <Select
          value={
            values.active === undefined
              ? ALL_VALUE
              : values.active
                ? "true"
                : "false"
          }
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : ALL_VALUE
            onChange({
              ...values,
              active: next === ALL_VALUE ? undefined : next === "true",
            })
          }}
        >
          <SelectTrigger id="filter-active" className="w-full">
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

      <Field className="md:w-40">
        <FieldLabel htmlFor="filter-deleted">Exibição</FieldLabel>
        <Select
          value={values.deleted ? "deleted" : "active"}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : "active"
            onChange({
              ...values,
              deleted: next === "deleted" ? true : undefined,
            })
          }}
        >
          <SelectTrigger id="filter-deleted" className="w-full">
            <SelectValueLabel
              labels={{
                active: "Ativas",
                deleted: "Lixeira",
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="deleted">Lixeira</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="md:w-44">
        <FieldLabel htmlFor="filter-auto-start">Início de</FieldLabel>
        <Input
          id="filter-auto-start"
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
        <FieldLabel htmlFor="filter-auto-end">Início até</FieldLabel>
        <Input
          id="filter-auto-end"
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
