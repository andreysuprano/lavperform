"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiClientError } from "@/services/api-client"
import { CompanyStatusBadge } from "@/features/companies/components/company-status-badge"
import { RevalidateWhatsappDialog } from "@/features/companies/components/revalidate-whatsapp-dialog"
import { useValidateCompanyWhatsapp } from "@/features/companies/companies-queries"
import type { CompanyStatus } from "@/features/companies/types"

import { DbInstanceStatusBadge } from "./db-instance-status-badge"
import { ConnectionLinksSection } from "./connection-links-section"
import { EditAdminFieldsDialog } from "./edit-admin-fields-dialog"
import { UazapiStatusBadge } from "./uazapi-status-badge"
import type { WhatsappInstanceListItem } from "../types"
import { formatDate, formatPhone, truncateToken } from "../utils"
import { useCompanyWhatsappInstance } from "../whatsapp-queries"

export function CompanyWhatsappView({ companyId }: { companyId: string }) {
  const query = useCompanyWhatsappInstance(companyId)
  const validateWhatsappMutation = useValidateCompanyWhatsapp()
  const [editOpen, setEditOpen] = useState(false)
  const [revalidateOpen, setRevalidateOpen] = useState(false)

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (query.error) {
    const isNotFound =
      query.error instanceof ApiClientError && query.error.statusCode === 404

    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-8">
        <p className="text-base font-medium">
          {isNotFound ? "Empresa não encontrada" : "Erro ao carregar instância"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "A empresa que você procura não existe ou foi removida."
            : query.error.message}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/whatsapp" />}
        >
          <ArrowLeftIcon />
          Voltar para WhatsApp
        </Button>
      </div>
    )
  }

  const data = query.data
  if (!data) return null

  const editInstance: WhatsappInstanceListItem | null = data.instance?.uazapi
    ? {
        id: data.instance.uazapi.id,
        token: data.instance.token,
        name: data.instance.name,
        status: data.instance.uazapi.status,
        lastDisconnect: data.instance.uazapi.lastDisconnect,
        updated: data.instance.uazapi.updated,
        created: data.instance.uazapi.created,
        adminField01: data.instance.uazapi.adminField01,
        adminField02: data.instance.uazapi.adminField02,
        systemName: data.instance.uazapi.systemName,
        company: {
          id: data.company.id,
          name: data.company.name,
          email: data.company.email,
          state: data.company.state,
        },
      }
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/whatsapp" />}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {data.company.name}
              </h1>
              <CompanyStatusBadge status={data.company.state as CompanyStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{data.company.email}</p>
          </div>
        </div>

        {editInstance && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Editar campos admin
          </Button>
        )}
      </div>

      {!data.instance ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem instância</CardTitle>
            <CardDescription>
              Esta empresa ainda não possui instância WhatsApp. Use o botão abaixo
              para gerar um link de conexão — uma nova instância será criada
              automaticamente na UAZAPI com token gerado.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Status local (banco)</CardTitle>
              <CardDescription>
                Dados persistidos em WhatsappInstance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4">
                <DetailRow label="Nome" value={data.instance.name} />
                <DetailRow
                  label="Status"
                  value={<DbInstanceStatusBadge status={data.instance.status} />}
                />
                <DetailRow
                  label="Telefone"
                  value={formatPhone(data.instance.phoneNumber)}
                  mono
                />
                <DetailRow
                  label="Token"
                  value={truncateToken(data.instance.token)}
                  mono
                  title={data.instance.token}
                />
                <DetailRow
                  label="Criada em"
                  value={formatDate(data.instance.createdAt)}
                />
                <DetailRow
                  label="Atualizada em"
                  value={formatDate(data.instance.updatedAt)}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status UAZAPI</CardTitle>
              <CardDescription>
                Estado atual no servidor WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.instance.uazapi ? (
                <dl className="grid gap-4">
                  <DetailRow
                    label="Status"
                    value={
                      <UazapiStatusBadge status={data.instance.uazapi.status} />
                    }
                  />
                  <DetailRow
                    label="adminField01"
                    value={data.instance.uazapi.adminField01 ?? "—"}
                  />
                  <DetailRow
                    label="adminField02"
                    value={data.instance.uazapi.adminField02 ?? "—"}
                    mono
                  />
                  <DetailRow
                    label="systemName"
                    value={data.instance.uazapi.systemName ?? "—"}
                  />
                  <DetailRow
                    label="Última desconexão"
                    value={formatDate(data.instance.uazapi.lastDisconnect)}
                  />
                  <DetailRow
                    label="Atualizado na UAZAPI"
                    value={formatDate(data.instance.uazapi.updated)}
                  />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Instância não encontrada na UAZAPI (token pode estar desatualizado).
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConnectionLinksSection
        companyId={companyId}
        companyName={data.company.name}
        hasExistingInstance={Boolean(data.instance)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Validação de clientes</CardTitle>
          <CardDescription>
            Revalida se os telefones dos clientes possuem WhatsApp ativo. Todos
            os clientes da empresa (exceto placeholders) serão enfileirados na
            fila de validação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setRevalidateOpen(true)}
            disabled={validateWhatsappMutation.isPending}
          >
            <RefreshCwIcon />
            Revalidar WhatsApp dos clientes
          </Button>
        </CardContent>
      </Card>

      <EditAdminFieldsDialog
        instance={editInstance}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <RevalidateWhatsappDialog
        open={revalidateOpen}
        onOpenChange={setRevalidateOpen}
        companyName={data.company.name}
        isPending={validateWhatsappMutation.isPending}
        onConfirm={() => {
          validateWhatsappMutation.mutate(companyId, {
            onSuccess: () => setRevalidateOpen(false),
          })
        }}
      />
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  title,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  title?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          mono
            ? "font-mono text-sm text-foreground"
            : "text-sm text-foreground"
        }
        title={title}
      >
        {value}
      </dd>
    </div>
  )
}
