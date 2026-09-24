"use client"

import { useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  useCreateCatalogPartner,
  useIntegrationPartners,
  useUpdateCatalogPartner,
} from "../integrations-queries"
import type { IntegrationPartner } from "../types"
import { partnerSlugLabel } from "../utils"

type Draft = {
  name: string
  partnerSlug: string
  baseUrlWebhook: string
  active: boolean
}

const emptyDraft: Draft = {
  name: "",
  partnerSlug: "",
  baseUrlWebhook: "",
  active: true,
}

export function CatalogPartnersView() {
  const partnersQuery = useIntegrationPartners()
  const createMutation = useCreateCatalogPartner()
  const updateMutation = useUpdateCatalogPartner()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IntegrationPartner | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  function openCreate() {
    setEditing(null)
    setDraft(emptyDraft)
    setOpen(true)
  }

  function openEdit(partner: IntegrationPartner) {
    setEditing(partner)
    setDraft({
      name: partner.name,
      partnerSlug: partner.partnerSlug ?? "",
      baseUrlWebhook: partner.baseUrlWebhook ?? "",
      active: partner.active,
    })
    setOpen(true)
  }

  function save() {
    const body = {
      name: draft.name.trim(),
      partnerSlug: draft.partnerSlug.trim(),
      baseUrlWebhook: draft.baseUrlWebhook.trim() || undefined,
      active: draft.active,
    }
    if (editing) {
      updateMutation.mutate(
        { partnerId: editing.id, body },
        { onSuccess: () => setOpen(false) }
      )
      return
    }
    createMutation.mutate(body, { onSuccess: () => setOpen(false) })
  }

  const pending = createMutation.isPending || updateMutation.isPending
  const partners = partnersQuery.data ?? []

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo que aparece na tela de integrações do cliente.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon />
          Nova integração
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Identificador</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr key={partner.id} className="border-t">
                <td className="px-4 py-3">{partner.name}</td>
                <td className="px-4 py-3">
                  {partnerSlugLabel(partner.partnerSlug)}
                </td>
                <td className="px-4 py-3">
                  {partner.active ? "Ativa" : "Inativa"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(partner)}
                  >
                    <PencilIcon />
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
            {partners.length === 0 && !partnersQuery.isLoading && (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  Nenhuma integração no catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar integração" : "Nova integração"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="catalog-name">Nome</Label>
              <Input
                id="catalog-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="catalog-slug">Identificador</Label>
              <Input
                id="catalog-slug"
                value={draft.partnerSlug}
                placeholder="AGIDEZ"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    partnerSlug: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="catalog-webhook">Webhook</Label>
              <Input
                id="catalog-webhook"
                value={draft.baseUrlWebhook}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    baseUrlWebhook: event.target.value,
                  }))
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.active}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    active: checked === true,
                  }))
                }
              />
              Integração ativa na tela do cliente
            </label>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={pending || !draft.name.trim() || !draft.partnerSlug.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
