"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, KeyIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCompany } from "@/features/companies/companies-queries"

import {
  useCompanyApiKeys,
  useCreateCompanyApiKey,
  useDeleteCompanyApiKey,
  useRevokeCompanyApiKey,
} from "../api-keys-queries"
import type { PublicApiKey } from "../types"
import { ApiKeySecretDialog } from "./api-key-secret-dialog"
import { ApiKeysTable } from "./api-keys-table"
import { CreateApiKeyDialog } from "./create-api-key-dialog"

export function CompanyApiKeysView({ companyId }: { companyId: string }) {
  const companyQuery = useCompany(companyId)
  const apiKeysQuery = useCompanyApiKeys(companyId)

  const createMutation = useCreateCompanyApiKey(companyId)
  const revokeMutation = useRevokeCompanyApiKey(companyId)
  const deleteMutation = useDeleteCompanyApiKey(companyId)

  const [createOpen, setCreateOpen] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<PublicApiKey | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PublicApiKey | null>(null)

  function handleCreate(values: { name?: string; expiresAt?: string }) {
    createMutation.mutate(
      {
        name: values.name?.trim() || undefined,
        expiresAt: values.expiresAt
          ? new Date(values.expiresAt).toISOString()
          : undefined,
      },
      {
        onSuccess: (result) => {
          setCreateOpen(false)
          setCreatedSecret(result.secret)
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href={`/companies/${companyId}`} />}
          >
            <ArrowLeftIcon />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              API keys — {companyQuery.data?.name ?? "..."}
            </h2>
            <p className="text-sm text-muted-foreground">
              Chaves para integração direta via Public API
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Nova API key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="size-5" />
            Chaves de acesso
          </CardTitle>
          <CardDescription>
            Cada chave identifica a empresa nas requisições autenticadas em{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              POST /v1/orders
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysTable
            apiKeys={apiKeysQuery.data ?? []}
            isLoading={apiKeysQuery.isLoading}
            error={apiKeysQuery.error}
            onRetry={() => apiKeysQuery.refetch()}
            onRevoke={(apiKey) => setRevokeTarget(apiKey)}
            onDelete={(apiKey) => setDeleteTarget(apiKey)}
            isRevoking={revokeMutation.isPending}
            isDeleting={deleteMutation.isPending}
          />
        </CardContent>
      </Card>

      <CreateApiKeyDialog
        open={createOpen}
        isSubmitting={createMutation.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <ApiKeySecretDialog
        open={Boolean(createdSecret)}
        secret={createdSecret ?? ""}
        onClose={() => setCreatedSecret(null)}
      />

      <AlertDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar API key?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave <strong>{revokeTarget?.name}</strong> deixará de aceitar
              requisições imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!revokeTarget) return
                revokeMutation.mutate(revokeTarget.id, {
                  onSuccess: () => setRevokeTarget(null),
                })
              }}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove permanentemente a chave{" "}
              <strong>{deleteTarget?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
