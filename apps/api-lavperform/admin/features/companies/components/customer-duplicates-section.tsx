"use client"

import { Loader2, UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "../utils"
import {
  useCustomerDuplicates,
  useKeepSeparateCustomers,
  useMergeCustomers,
  useScanCustomerDuplicates,
} from "../companies-queries"
import type { DuplicateReviewGroup } from "../companies-api"

function sourceLabel(source: DuplicateReviewGroup["source"]) {
  if (source === "phone") return "Telefone"
  if (source === "cpf") return "CPF"
  return "Telefone vs CPF"
}

export function CustomerDuplicatesSection({
  companyId,
}: {
  companyId: string
}) {
  const query = useCustomerDuplicates(companyId)
  const scanMutation = useScanCustomerDuplicates(companyId)
  const mergeMutation = useMergeCustomers(companyId)
  const keepSeparateMutation = useKeepSeparateCustomers(companyId)

  const review = query.data?.review ?? []
  const pending = scanMutation.isPending || mergeMutation.isPending || keepSeparateMutation.isPending

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Clientes duplicados</CardTitle>
          <CardDescription>
            Mescla automática nos casos óbvios; revise nomes divergentes ou
            identificadores cruzados. Cadastros sem telefone e sem CPF não entram
            aqui.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() => scanMutation.mutate()}
          disabled={pending}
        >
          {scanMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <UsersIcon />
          )}
          Escanear duplicatas
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : review.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum grupo pendente de revisão
            {query.data
              ? ` (${query.data.autoMergeGroups} grupo(s) óbvio(s) no último preview).`
              : "."}
          </p>
        ) : (
          review.map((group) => (
            <DuplicateGroupCard
              key={group.id}
              group={group}
              disabled={pending}
              onMerge={(survivorId, absorbedIds) =>
                mergeMutation.mutate({ survivorId, absorbedIds })
              }
              onKeepSeparate={(keepIdentifierOnCustomerId, peerIds) =>
                keepSeparateMutation.mutate({
                  keepIdentifierOnCustomerId,
                  peerIds,
                })
              }
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function DuplicateGroupCard({
  group,
  disabled,
  onMerge,
  onKeepSeparate,
}: {
  group: DuplicateReviewGroup
  disabled: boolean
  onMerge: (survivorId: string, absorbedIds: string[]) => void
  onKeepSeparate: (keepIdentifierOnCustomerId: string, peerIds: string[]) => void
}) {
  const customers = group.customers

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {sourceLabel(group.source)}
          {group.matchValue ? ` · ${group.matchValue}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {customers.map((customer) => {
            const peers = customers
              .filter((item) => item.id !== customer.id)
              .map((item) => item.id)
            return (
              <Button
                key={`merge-${customer.id}`}
                size="sm"
                variant="outline"
                disabled={disabled || peers.length === 0}
                onClick={() => onMerge(customer.id, peers)}
              >
                Mesclar em {customer.name.split(" ")[0]}
              </Button>
            )
          })}
          {customers[0] && (
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled || customers.length < 2}
              onClick={() =>
                onKeepSeparate(
                  customers[0].id,
                  customers.slice(1).map((item) => item.id)
                )
              }
            >
              Manter separados
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {customers.map((customer) => (
          <div key={customer.id} className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium">{customer.name}</p>
            <p className="text-muted-foreground">
              Tel. {customer.phone || "—"} · CPF {customer.cpf || "—"}
            </p>
            <p className="text-muted-foreground">
              {customer.orderCount} pedido(s) · criado em{" "}
              {formatDate(customer.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
