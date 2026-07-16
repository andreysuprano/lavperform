"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  useAdminPlans,
  useCreatePlan,
  useDeletePlan,
  useTogglePlanActive,
  useUpdatePlan,
} from "../../billing-queries"
import type { PlanInput } from "../../schemas"
import type { Plan } from "../../types"
import { cycleLabel, formatBRL } from "../../utils"
import { ConfirmActionDialog } from "../shared/confirm-action-dialog"
import { PlanFormDialog } from "./plan-form-dialog"

export function PlansTable() {
  const [search, setSearch] = useState("")
  const query = useAdminPlans({
    includeInactive: true,
    search: search || undefined,
  })
  const createMutation = useCreatePlan()
  const updateMutation = useUpdatePlan()
  const toggleMutation = useTogglePlanActive()
  const deleteMutation = useDeletePlan()

  const [formOpen, setFormOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const items = query.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Button
          size="sm"
          onClick={() => {
            setEditPlan(null)
            setFormOpen(true)
          }}
        >
          <PlusIcon className="size-4" />
          Novo plano
        </Button>
      </div>

      {query.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum plano cadastrado.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {plan.description}
                      </span>
                      {plan.recommended && (
                        <Badge variant="outline" className="w-fit">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatBRL(plan.price)}</TableCell>
                  <TableCell>{cycleLabel(plan.cycle)}</TableCell>
                  <TableCell>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditPlan(plan)
                        setFormOpen(true)
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => toggleMutation.mutate(plan.id)}
                    >
                      <PowerIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleteId(plan.id)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editPlan}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data: PlanInput) => {
          const payload = {
            ...data,
            endDate: data.endDate?.trim() ? data.endDate : undefined,
          }

          if (editPlan) {
            updateMutation.mutate(
              { id: editPlan.id, input: payload },
              {
                onSuccess: () => {
                  setFormOpen(false)
                  setEditPlan(null)
                },
              }
            )
          } else {
            createMutation.mutate(payload, {
              onSuccess: () => setFormOpen(false),
            })
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remover plano"
        description="Somente planos sem empresas vinculadas podem ser removidos."
        confirmLabel="Remover"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteId) return
          deleteMutation.mutate(deleteId, {
            onSuccess: () => setDeleteId(null),
          })
        }}
      />
    </div>
  )
}
