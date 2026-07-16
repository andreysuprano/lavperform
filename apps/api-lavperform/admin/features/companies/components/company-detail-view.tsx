"use client"

import { useState } from "react"
import Link from "next/link"
import { useAppRouter } from "@/hooks/use-app-router"
import {
  ArrowLeftIcon,
  ChartNoAxesCombinedIcon,
  CreditCardIcon,
  KeyIcon,
  MessageCircleIcon,
  PencilIcon,
  PlugIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ApiClientError } from "@/services/api-client"
import { BusinessPartnerDisplay } from "@/features/business-partners/components/business-partner-display"

import {
  useCompany,
  useDeleteCompany,
  useReprocessCompanyRfv,
  useUpdateCompanyState,
  useValidateCompanyWhatsapp,
} from "../companies-queries"
import {
  formatCnpj,
  formatDate,
  formatZipCode,
} from "../utils"
import type { CompanyStatus } from "../types"
import { CompanyActionsMenu } from "./company-actions-menu"
import { CompanyStatusBadge } from "./company-status-badge"
import { CompanyUsersSection } from "./company-users-section"
import { DeleteCompanyDialog } from "./delete-company-dialog"
import { ReprocessRfvDialog } from "./reprocess-rfv-dialog"
import { RevalidateWhatsappDialog } from "./revalidate-whatsapp-dialog"

export function CompanyDetailView({ companyId }: { companyId: string }) {
  const router = useAppRouter()

  const companyQuery = useCompany(companyId)
  const stateMutation = useUpdateCompanyState()
  const deleteMutation = useDeleteCompany()
  const validateWhatsappMutation = useValidateCompanyWhatsapp()
  const reprocessRfvMutation = useReprocessCompanyRfv()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [revalidateOpen, setRevalidateOpen] = useState(false)
  const [reprocessRfvOpen, setReprocessRfvOpen] = useState(false)

  if (companyQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (companyQuery.error) {
    const isNotFound =
      companyQuery.error instanceof ApiClientError &&
      companyQuery.error.statusCode === 404

    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-8">
        <p className="text-base font-medium">
          {isNotFound ? "Empresa não encontrada" : "Erro ao carregar empresa"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "A empresa que você procura não existe ou foi removida."
            : companyQuery.error.message}
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/companies" />}
        >
          <ArrowLeftIcon />
          Voltar para empresas
        </Button>
      </div>
    )
  }

  const company = companyQuery.data
  if (!company) return null

  function handleChangeState(state: CompanyStatus) {
    stateMutation.mutate({ id: companyId, state })
  }

  function handleDelete() {
    deleteMutation.mutate(companyId, {
      onSuccess: () => {
        setConfirmDelete(false)
        router.push("/companies")
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/companies" />}
        >
          <ArrowLeftIcon />
          Voltar
        </Button>
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {company.name}
              </h2>
              <CompanyStatusBadge status={company.state} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {formatCnpj(company.cnpj)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/companies/${company.id}/billing`} />}
            >
              <CreditCardIcon />
              Faturamento
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/companies/${company.id}/integrations`} />}
            >
              <PlugIcon />
              Integrações
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/companies/${company.id}/api-keys`} />}
            >
              <KeyIcon />
              API keys
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/whatsapp/company/${company.id}`} />}
            >
              <MessageCircleIcon />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setRevalidateOpen(true)}
              disabled={validateWhatsappMutation.isPending}
            >
              <RefreshCwIcon />
              Revalidar WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setReprocessRfvOpen(true)}
              disabled={reprocessRfvMutation.isPending}
            >
              <ChartNoAxesCombinedIcon />
              Reprocessar RFV
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/companies/${company.id}/edit`} />}
            >
              <PencilIcon />
              Editar
            </Button>
            <CompanyActionsMenu
              company={company}
              onChangeState={handleChangeState}
              onDelete={() => setConfirmDelete(true)}
              triggerVariant="outline"
              triggerSize="default"
              showViewDetails={false}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Dados gerais</TabsTrigger>
          <TabsTrigger value="address">Endereço</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Informações da empresa</CardTitle>
              <CardDescription>
                Dados cadastrais e identificação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <DetailRow label="Slug" value={company.slug ?? "—"} mono />
                <DetailRow label="CNPJ" value={formatCnpj(company.cnpj)} mono />
                <DetailRow label="Email" value={company.email} />
                <DetailRow label="Telefone" value={company.phone ?? "—"} />
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    Parceiro de negócio
                  </dt>
                  <dd>
                    <BusinessPartnerDisplay
                      partnerId={company.businessPartnerId}
                    />
                  </dd>
                </div>
                <DetailRow
                  label="Criada em"
                  value={formatDate(company.createdAt)}
                />
                <DetailRow
                  label="Atualizada em"
                  value={formatDate(company.updatedAt)}
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>
                Endereço comercial cadastrado para a empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {company.address ? (
                <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                  <DetailRow
                    label="CEP"
                    value={formatZipCode(company.address.zipCode)}
                  />
                  <DetailRow label="Rua" value={company.address.street} />
                  <DetailRow label="Número" value={company.address.number} />
                  <DetailRow
                    label="Complemento"
                    value={company.address.complement ?? "—"}
                  />
                  <DetailRow
                    label="Bairro"
                    value={company.address.neighborhood}
                  />
                  <DetailRow label="Cidade" value={company.address.city} />
                  <DetailRow label="UF" value={company.address.state} />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Endereço não cadastrado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <CompanyUsersSection companyId={companyId} />
        </TabsContent>
      </Tabs>

      <DeleteCompanyDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        companyName={company.name}
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <RevalidateWhatsappDialog
        open={revalidateOpen}
        onOpenChange={setRevalidateOpen}
        companyName={company.name}
        isPending={validateWhatsappMutation.isPending}
        onConfirm={() => {
          validateWhatsappMutation.mutate(companyId, {
            onSuccess: () => setRevalidateOpen(false),
          })
        }}
      />

      <ReprocessRfvDialog
        open={reprocessRfvOpen}
        onOpenChange={setReprocessRfvOpen}
        companyName={company.name}
        isPending={reprocessRfvMutation.isPending}
        onConfirm={() => {
          reprocessRfvMutation.mutate(companyId, {
            onSuccess: () => setReprocessRfvOpen(false),
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
}: {
  label: string
  value: string
  mono?: boolean
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
      >
        {value}
      </dd>
    </div>
  )
}
