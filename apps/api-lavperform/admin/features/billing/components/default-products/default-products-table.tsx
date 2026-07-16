"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon, PowerIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

import {
  useCreateDefaultProduct,
  useDefaultProducts,
  useDeleteDefaultProduct,
  useRestoreDefaultProduct,
  useToggleDefaultProductActive,
  useUpdateDefaultProduct,
} from "../../billing-queries"
import type { DefaultCreditProduct } from "../../types"
import { formatCents } from "../../utils"
import { ConfirmActionDialog } from "../shared/confirm-action-dialog"
import { DefaultProductFormDialog } from "./default-product-form-dialog"
import type { DefaultProductInput } from "../../schemas"

export function DefaultProductsTable() {
  const [search, setSearch] = useState("")
  const query = useDefaultProducts({ search: search || undefined })
  const createMutation = useCreateDefaultProduct()
  const updateMutation = useUpdateDefaultProduct()
  const toggleMutation = useToggleDefaultProductActive()
  const restoreMutation = useRestoreDefaultProduct()
  const deleteMutation = useDeleteDefaultProduct()

  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<DefaultCreditProduct | null>(
    null
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const items = query.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" onClick={() => { setEditProduct(null); setFormOpen(true) }}>
          <PlusIcon className="size-4" />
          Nova oferta
        </Button>
      </div>

      {query.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma oferta default cadastrada.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{p.code}</code>
                  </TableCell>
                  <TableCell>{formatCents(p.priceCents)}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.deletedAt ? "Removido" : p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditProduct(p)
                        setFormOpen(true)
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    {!p.deletedAt && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => toggleMutation.mutate(p.id)}
                      >
                        <PowerIcon className="size-4" />
                      </Button>
                    )}
                    {p.deletedAt && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => restoreMutation.mutate(p.id)}
                      >
                        <RotateCcwIcon className="size-4" />
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setDeleteId(p.id)}
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

      <DefaultProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editProduct}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={(data: DefaultProductInput) => {
          if (editProduct) {
            updateMutation.mutate(
              { id: editProduct.id, input: data },
              { onSuccess: () => { setFormOpen(false); setEditProduct(null) } }
            )
          } else {
            createMutation.mutate(data, {
              onSuccess: () => setFormOpen(false),
            })
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remover oferta default"
        description="A oferta será removida do catálogo global."
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
