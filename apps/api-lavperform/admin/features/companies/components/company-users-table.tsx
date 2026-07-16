"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserActionsMenu } from "@/features/users/components/user-actions-menu"

import type { CompanyUser } from "../types"

export function CompanyUsersTable({
  users,
  isLoading,
  onEdit,
  onChangePassword,
  onUnlink,
  onDelete,
}: {
  users: CompanyUser[]
  isLoading: boolean
  onEdit: (user: CompanyUser) => void
  onChangePassword: (user: CompanyUser) => void
  onUnlink: (user: CompanyUser) => void
  onDelete: (user: CompanyUser) => void
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-5 w-full max-w-md animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center">
        <p className="text-sm font-medium">Nenhum usuário vinculado</p>
        <p className="text-xs text-muted-foreground">
          Esta empresa ainda não possui usuários associados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="w-12 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.phone ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <UserActionsMenu
                  onEdit={() => onEdit(user)}
                  onChangePassword={() => onChangePassword(user)}
                  onUnlink={() => onUnlink(user)}
                  onDelete={() => onDelete(user)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
