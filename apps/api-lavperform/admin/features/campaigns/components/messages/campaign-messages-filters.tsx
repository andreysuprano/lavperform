"use client"

import { useEffect, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  ALL_FILTER_LABEL,
  ALL_FILTER_LABEL_FEM,
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
import { Checkbox } from "@/components/ui/checkbox"

import type { CampaignChannel, MessageListParams, MessageStatus } from "../../types"
import {
  CAMPAIGN_CHANNEL_VALUES,
  MESSAGE_STATUS_VALUES,
} from "../../types"
import { CHANNEL_LABELS, MESSAGE_STATUS_LABELS } from "../../utils"

const ALL_VALUE = ALL_SELECT_VALUE

type Filters = Pick<
  MessageListParams,
  | "phone"
  | "customerName"
  | "channel"
  | "startDate"
  | "endDate"
  | "error"
  | "status"
  | "hasSale"
>

export function CampaignMessagesFilters({
  values,
  onChange,
  onClear,
}: {
  values: Filters
  onChange: (next: Filters) => void
  onClear: () => void
}) {
  const [phoneInput, setPhoneInput] = useState(values.phone ?? "")
  const [customerInput, setCustomerInput] = useState(values.customerName ?? "")
  const [errorInput, setErrorInput] = useState(values.error ?? "")

  useEffect(() => {
    setPhoneInput(values.phone ?? "")
  }, [values.phone])

  useEffect(() => {
    setCustomerInput(values.customerName ?? "")
  }, [values.customerName])

  useEffect(() => {
    setErrorInput(values.error ?? "")
  }, [values.error])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.phone ?? "") === phoneInput) return
      onChange({ ...values, phone: phoneInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [phoneInput, values, onChange])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.customerName ?? "") === customerInput) return
      onChange({ ...values, customerName: customerInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [customerInput, values, onChange])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if ((values.error ?? "") === errorInput) return
      onChange({ ...values, error: errorInput || undefined })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [errorInput, values, onChange])

  const selectedStatuses = new Set(values.status ?? [])

  function toggleStatus(status: MessageStatus) {
    const next = new Set(selectedStatuses)
    if (next.has(status)) {
      next.delete(status)
    } else {
      next.add(status)
    }
    onChange({
      ...values,
      status: next.size > 0 ? Array.from(next) : undefined,
    })
  }

  const hasFilters = Boolean(
    values.phone ||
      values.customerName ||
      values.channel ||
      values.startDate ||
      values.endDate ||
      values.error ||
      values.hasSale ||
      (values.status && values.status.length > 0)
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <Field className="md:w-48">
          <FieldLabel htmlFor="filter-phone">Telefone</FieldLabel>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="filter-phone"
              value={phoneInput}
              placeholder="5511999999999"
              className="pl-7"
              onChange={(event) => setPhoneInput(event.target.value)}
            />
          </div>
        </Field>

        <Field className="md:w-48">
          <FieldLabel htmlFor="filter-customer">Cliente</FieldLabel>
          <Input
            id="filter-customer"
            value={customerInput}
            placeholder="Nome do cliente"
            onChange={(event) => setCustomerInput(event.target.value)}
          />
        </Field>

        <Field className="md:w-44">
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

        <Field className="md:w-44">
          <FieldLabel htmlFor="filter-msg-start">Início</FieldLabel>
          <Input
            id="filter-msg-start"
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
          <FieldLabel htmlFor="filter-msg-end">Fim</FieldLabel>
          <Input
            id="filter-msg-end"
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

        <Field className="md:w-48">
          <FieldLabel htmlFor="filter-error">Erro</FieldLabel>
          <Input
            id="filter-error"
            value={errorInput}
            placeholder="Texto do erro"
            onChange={(event) => setErrorInput(event.target.value)}
          />
        </Field>

        <Field className="md:w-44">
          <FieldLabel htmlFor="filter-has-sale">Com venda</FieldLabel>
          <Select
            value={
              values.hasSale === undefined
                ? ALL_VALUE
                : values.hasSale
                  ? "true"
                  : "false"
            }
            onValueChange={(value) => {
              const next = typeof value === "string" ? value : ALL_VALUE
              onChange({
                ...values,
                hasSale:
                  next === ALL_VALUE ? undefined : next === "true",
              })
            }}
          >
            <SelectTrigger id="filter-has-sale" className="w-full">
              <SelectValueLabel
                labels={{
                  ...BOOLEAN_FILTER_LABELS,
                  [ALL_VALUE]: ALL_FILTER_LABEL_FEM,
                }}
                placeholder={ALL_FILTER_LABEL_FEM}
                emptyValues={[ALL_VALUE]}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_VALUE}>{ALL_FILTER_LABEL_FEM}</SelectItem>
                <SelectItem value="true">Somente com venda</SelectItem>
                <SelectItem value="false">Sem venda</SelectItem>
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

      <div className="flex flex-wrap gap-3">
        <span className="text-xs text-muted-foreground">Status:</span>
        {MESSAGE_STATUS_VALUES.map((status) => (
          <label
            key={status}
            className="flex cursor-pointer items-center gap-1.5 text-xs"
          >
            <Checkbox
              checked={selectedStatuses.has(status)}
              onCheckedChange={() => toggleStatus(status)}
            />
            {MESSAGE_STATUS_LABELS[status]}
          </label>
        ))}
      </div>
    </div>
  )
}
