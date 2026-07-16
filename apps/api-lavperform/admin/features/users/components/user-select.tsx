"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useUsers } from "../users-queries"

const NONE_VALUE = "__none__"

export function UserSelect({
  id,
  value,
  onChange,
  placeholder = "Selecione um usuário",
  disabled,
  excludeIds = [],
}: {
  id?: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  excludeIds?: string[]
}) {
  const { data, isLoading, error } = useUsers({
    page: 1,
    limit: 100,
    orderBy: "name",
    orderDirection: "asc",
  })

  const allUsers = data?.items ?? []
  const excludeSet = new Set(excludeIds)
  const users = allUsers.filter((user) => !excludeSet.has(user.id))
  const hasUsers = users.length > 0
  const selectedValue = value ?? NONE_VALUE

  const userById = useMemo(
    () => new Map(allUsers.map((user) => [user.id, user])),
    [allUsers]
  )

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
        Não foi possível carregar os usuários: {error.message}
      </div>
    )
  }

  return (
    <Select
      value={selectedValue}
      onValueChange={(next) => {
        const resolved = typeof next === "string" ? next : NONE_VALUE
        onChange(resolved === NONE_VALUE ? null : resolved)
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando usuários...
          </span>
        ) : (
          <SelectValue placeholder={placeholder}>
            {(current) => {
              const idValue =
                typeof current === "string" ? current : NONE_VALUE
              if (!idValue || idValue === NONE_VALUE) {
                return (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              }
              const user = userById.get(idValue)
              return user?.name ?? placeholder
            }}
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
          {!hasUsers && !isLoading && (
            <SelectItem value="__empty__" disabled>
              Nenhum usuário disponível
            </SelectItem>
          )}
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex flex-col">
                <span className="font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
