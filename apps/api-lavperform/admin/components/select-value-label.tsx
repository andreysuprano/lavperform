"use client"

import type { ReactNode } from "react"

import { SelectValue } from "@/components/ui/select"

export const ALL_SELECT_VALUE = "__all__"
export const ALL_FILTER_LABEL = "Todos"
export const ALL_FILTER_LABEL_FEM = "Todas"

function resolveSelectLabel(
  value: string,
  labels: Record<string, string>,
  placeholder?: string,
  emptyValues: string[] = []
): string | null {
  if (value === ALL_SELECT_VALUE) {
    return labels[ALL_SELECT_VALUE] ?? placeholder ?? ALL_FILTER_LABEL
  }

  if (!value || emptyValues.includes(value)) {
    return labels[value] ?? placeholder ?? null
  }

  const label = labels[value] ?? value
  return label === ALL_SELECT_VALUE ? ALL_FILTER_LABEL : label
}

function resolveLookupLabel(
  value: string,
  lookup: (value: string) => string | undefined,
  placeholder?: string,
  emptyValues: string[] = []
): string | null {
  if (value === ALL_SELECT_VALUE || emptyValues.includes(value)) {
    return placeholder ?? ALL_FILTER_LABEL
  }

  if (!value) {
    return placeholder ?? null
  }

  const label = lookup(value) ?? placeholder ?? value
  return label === ALL_SELECT_VALUE ? (placeholder ?? ALL_FILTER_LABEL) : label
}

function renderSelectText(
  label: string | null,
  muted: boolean
): ReactNode {
  if (!label) return null
  if (muted) {
    return <span className="text-muted-foreground">{label}</span>
  }
  return label
}

export function SelectValueLabel({
  labels,
  placeholder,
  emptyValues = [],
}: {
  labels: Record<string, string>
  placeholder?: string
  emptyValues?: string[]
}) {
  return (
    <SelectValue placeholder={placeholder}>
      {(current) => {
        const value = typeof current === "string" ? current : ""
        const label = resolveSelectLabel(value, labels, placeholder, emptyValues)
        const muted =
          !value ||
          emptyValues.includes(value) ||
          value === ALL_SELECT_VALUE

        return renderSelectText(label, muted)
      }}
    </SelectValue>
  )
}

export function SelectValueLookup({
  lookup,
  placeholder,
  emptyValues = [],
}: {
  lookup: (value: string) => string | undefined
  placeholder?: string
  emptyValues?: string[]
}) {
  return (
    <SelectValue placeholder={placeholder}>
      {(current) => {
        const value = typeof current === "string" ? current : ""
        const label = resolveLookupLabel(value, lookup, placeholder, emptyValues)
        const muted =
          !value ||
          emptyValues.includes(value) ||
          value === ALL_SELECT_VALUE

        return renderSelectText(label, muted)
      }}
    </SelectValue>
  )
}

export const BOOLEAN_FILTER_LABELS: Record<string, string> = {
  true: "Sim",
  false: "Não",
}
