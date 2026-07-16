"use client"

import { useState } from "react"
import { Loader2, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
  useCreateCreditProduct,
  useCreditProducts,
  useDeleteCreditProduct,
  useToggleCreditProductActive,
  useUpdateCreditProduct,
} from "../../billing-queries"
import { creditProductSchema, type CreditProductInput } from "../../schemas"
import type { CreditProduct } from "../../types"
import { formatCents } from "../../utils"

function ProductFormDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  defaultValues?: Partial<CreditProductInput>
  onSubmit: (data: CreditProductInput) => void
  isPending: boolean
}) {
  const form = useForm<CreditProductInput>({
    resolver: zodResolver(creditProductSchema),
    defaultValues: {
      name: "",
      code: "",
      priceCents: 100,
      active: true,
      ...defaultValues,
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field>
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <Input id="name" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="code">Código</FieldLabel>
            <Input id="code" {...form.register("code")} />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="priceCents">Preço (centavos)</FieldLabel>
            <Input
              id="priceCents"
              type="number"
              {...form.register("priceCents")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Descrição</FieldLabel>
            <Input id="description" {...form.register("description")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreditProductsTable({ companyId }: { companyId: string }) {
  const query = useCreditProducts(companyId, { limit: 100 })
  const createMutation = useCreateCreditProduct(companyId)
  const updateMutation = useUpdateCreditProduct(companyId)
  const toggleMutation = useToggleCreditProductActive(companyId)
  const deleteMutation = useDeleteCreditProduct(companyId)

  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<CreditProduct | null>(null)

  const items = query.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          Novo produto
        </Button>
      </div>

      {query.isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum produto personalizado. Ofertas default do catálogo global
          podem ser usadas.
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
                <TableHead className="w-28" />
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
                      {p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditProduct(p)}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => toggleMutation.mutate(p.id)}
                    >
                      <PowerIcon className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(p.id)}
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

      <ProductFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Novo produto de crédito"
        isPending={createMutation.isPending}
        onSubmit={(data) =>
          createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) })
        }
      />
      {editProduct && (
        <ProductFormDialog
          open={Boolean(editProduct)}
          onOpenChange={(o) => !o && setEditProduct(null)}
          title="Editar produto"
          defaultValues={{
            name: editProduct.name,
            code: editProduct.code,
            priceCents: editProduct.priceCents,
            description: editProduct.description ?? "",
            active: editProduct.active,
          }}
          isPending={updateMutation.isPending}
          onSubmit={(data) =>
            updateMutation.mutate(
              { id: editProduct.id, input: data },
              { onSuccess: () => setEditProduct(null) }
            )
          }
        />
      )}
    </div>
  )
}
