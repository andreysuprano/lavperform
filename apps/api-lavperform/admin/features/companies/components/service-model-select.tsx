"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  COMPANY_SERVICE_MODEL_LABELS,
  COMPANY_SERVICE_MODEL_VALUES,
  type CompanyServiceModel,
} from "../types"

export function ServiceModelSelect({
  value,
  onValueChange,
  id,
  disabled,
}: {
  value: CompanyServiceModel
  onValueChange: (value: CompanyServiceModel) => void
  id?: string
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as CompanyServiceModel)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Selecione o modelo">
          {COMPANY_SERVICE_MODEL_LABELS[value] ?? value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COMPANY_SERVICE_MODEL_VALUES.map((option) => (
          <SelectItem key={option} value={option}>
            {COMPANY_SERVICE_MODEL_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
