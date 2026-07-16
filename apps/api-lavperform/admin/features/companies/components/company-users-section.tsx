"use client"

import { useState } from "react"
import { UserPlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AddUserToCompanyDialog } from "@/features/users/components/add-user-to-company-dialog"
import { ChangePasswordDialog } from "@/features/users/components/change-password-dialog"
import { EditUserDialog } from "@/features/users/components/edit-user-dialog"
import { RemoveUserFromCompanyDialog } from "@/features/users/components/remove-user-from-company-dialog"
import {
  useDeleteUser,
  useUnassignUserFromCompany,
} from "@/features/users/users-queries"

import { useCompanyUsers } from "../companies-queries"
import type { CompanyUser } from "../types"
import { CompanyUsersTable } from "./company-users-table"

type DialogState =
  | { type: "edit"; user: CompanyUser }
  | { type: "password"; user: CompanyUser }
  | { type: "unlink"; user: CompanyUser }
  | { type: "delete"; user: CompanyUser }
  | null

export function CompanyUsersSection({ companyId }: { companyId: string }) {
  const usersQuery = useCompanyUsers(companyId)
  const unassignMutation = useUnassignUserFromCompany()
  const deleteUserMutation = useDeleteUser()

  const [addOpen, setAddOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)

  const users = usersQuery.data ?? []
  const excludeIds = users.map((user) => user.id)

  function handleUnlinkConfirm() {
    if (dialog?.type !== "unlink") return
    unassignMutation.mutate(
      { userId: dialog.user.id, companyId },
      {
        onSuccess: () => setDialog(null),
      }
    )
  }

  function handleDeleteConfirm() {
    if (dialog?.type !== "delete") return
    deleteUserMutation.mutate(dialog.user.id, {
      onSuccess: () => setDialog(null),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Usuários vinculados</h3>
          <p className="text-xs text-muted-foreground">
            Gerencie quem tem acesso a esta empresa, crie novos usuários e
            atualize dados e senha.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlusIcon />
          Adicionar usuário
        </Button>
      </div>

      <CompanyUsersTable
        users={users}
        isLoading={usersQuery.isLoading}
        onEdit={(user) => setDialog({ type: "edit", user })}
        onChangePassword={(user) => setDialog({ type: "password", user })}
        onUnlink={(user) => setDialog({ type: "unlink", user })}
        onDelete={(user) => setDialog({ type: "delete", user })}
      />

      <AddUserToCompanyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        companyId={companyId}
        excludeUserIds={excludeIds}
      />

      <EditUserDialog
        open={dialog?.type === "edit"}
        onOpenChange={(next) => {
          if (!next) setDialog(null)
        }}
        user={dialog?.type === "edit" ? dialog.user : null}
      />

      <ChangePasswordDialog
        open={dialog?.type === "password"}
        onOpenChange={(next) => {
          if (!next) setDialog(null)
        }}
        userId={dialog?.type === "password" ? dialog.user.id : null}
        userName={dialog?.type === "password" ? dialog.user.name : undefined}
      />

      <RemoveUserFromCompanyDialog
        open={dialog?.type === "unlink"}
        onOpenChange={(next) => {
          if (!next && !unassignMutation.isPending) setDialog(null)
        }}
        onConfirm={handleUnlinkConfirm}
        isPending={unassignMutation.isPending}
        userName={dialog?.type === "unlink" ? dialog.user.name : undefined}
        mode="unlink"
      />

      <RemoveUserFromCompanyDialog
        open={dialog?.type === "delete"}
        onOpenChange={(next) => {
          if (!next && !deleteUserMutation.isPending) setDialog(null)
        }}
        onConfirm={handleDeleteConfirm}
        isPending={deleteUserMutation.isPending}
        userName={dialog?.type === "delete" ? dialog.user.name : undefined}
        mode="delete"
      />
    </div>
  )
}
