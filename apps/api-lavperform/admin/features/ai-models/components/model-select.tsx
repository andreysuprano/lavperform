"use client"

import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { SelectValueLookup } from "@/components/select-value-label"

import type { AiModelOption } from "../types"

const VISIBLE_LIMIT = 100

function visibleModels(
  models: AiModelOption[],
  query: string,
  selected: string
) {
  const normalized = query.trim().toLowerCase()
  const matched = models.filter((model) => {
    if (!normalized) return true
    return (
      model.id.toLowerCase().includes(normalized) ||
      model.name.toLowerCase().includes(normalized)
    )
  })
  const limited = matched.slice(0, VISIBLE_LIMIT)
  if (selected && !limited.some((model) => model.id === selected)) {
    const current = models.find((model) => model.id === selected)
    if (current) limited.unshift(current)
  }
  return { items: limited, total: matched.length }
}

export function ModelSelect({
  id,
  models,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string
  models: AiModelOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder: string
}) {
  const [query, setQuery] = useState("")
  const { items, total } = useMemo(
    () => visibleModels(models, query, value),
    [models, query, value]
  )
  const labels = useMemo(() => {
    const map = new Map<string, string>()
    for (const model of models) {
      map.set(model.id, model.name === model.id ? model.id : model.name)
    }
    return map
  }, [models])

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={`${id}-search`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nome ou id"
        disabled={disabled}
        aria-label={`Buscar ${placeholder.toLowerCase()}`}
      />
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next)
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full max-w-xl">
          <SelectValueLookup
            lookup={(current) => labels.get(current)}
            placeholder={placeholder}
          />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {items.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Nenhum modelo encontrado
            </div>
          ) : (
            items.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name === model.id ? model.id : `${model.name}`}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value ? <span className="font-mono">{value}</span> : placeholder}
        {total > items.length
          ? ` · ${items.length} de ${total}. Continue a busca para ver o restante.`
          : ` · ${total} ${total === 1 ? "modelo" : "modelos"}`}
      </p>
    </div>
  )
}
