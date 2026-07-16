"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ADMIN_ROLE_OPTIONS } from "../roles"
import type { AdminPanelRole } from "../types"

export function AdminRoleSelect({
  value,
  onValueChange,
  id,
  disabled,
}: {
  value: AdminPanelRole
  onValueChange: (value: AdminPanelRole) => void
  id?: string
  disabled?: boolean
}) {
  const selected = ADMIN_ROLE_OPTIONS.find((option) => option.value === value)

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as AdminPanelRole)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Selecione o tipo">
          {selected?.label ?? value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ADMIN_ROLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
