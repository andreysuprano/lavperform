"use client"

import { useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdministratorsFilters } from "@/features/administrators/components/administrators-filters"
import { AdministratorsTable } from "@/features/administrators/components/administrators-table"
import { SuperAdminOnly } from "@/features/administrators/components/super-admin-only"
import { useAdministrators } from "@/features/administrators/administrators-queries"
import type { AdministratorListParams } from "@/features/administrators/types"

type AdministratorFilters = Pick<
  AdministratorListParams,
  "name" | "email" | "role" | "isActive"
>

function parseSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")
  const orderBy = searchParams.get("orderBy") ?? "createdAt"
  const orderDirection: "asc" | "desc" =
    searchParams.get("orderDirection") === "asc" ? "asc" : "desc"
  const name = searchParams.get("name") ?? undefined
  const email = searchParams.get("email") ?? undefined
  const isActiveParam = searchParams.get("isActive")
  const isActive =
    isActiveParam === "true"
      ? true
      : isActiveParam === "false"
        ? false
        : undefined
  const role = (searchParams.get("role") ?? undefined) as
    | AdministratorListParams["role"]
    | undefined

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    orderBy,
    orderDirection,
    name,
    email,
    role,
    isActive,
  }
}

function AdministratorsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const params = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams]
  )

  const { data, isLoading, isFetching, error, refetch } = useAdministrators(params)

  const setQuery = useCallback(
    (next: Partial<AdministratorListParams>) => {
      const url = new URLSearchParams(searchParams.toString())
      const merged: Record<string, unknown> = { ...params, ...next }

      Object.entries(merged).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          url.delete(key)
        } else {
          url.set(key, String(value))
        }
      })

      const qs = url.toString()
      router.replace(qs ? `/administrators?${qs}` : "/administrators", {
        scroll: false,
      })
    },
    [params, router, searchParams]
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Administradores
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os acessos ao painel e os tipos de usuário da equipe.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/administrators/new" />}>
          <PlusIcon />
          Novo administrador
        </Button>
      </div>

      <AdministratorsFilters
        values={{
          name: params.name,
          email: params.email,
          role: params.role,
          isActive: params.isActive,
        }}
        onChange={(next) => setQuery({ ...next, page: 1 })}
        onClear={() =>
          setQuery({
            name: undefined,
            email: undefined,
            role: undefined,
            isActive: undefined,
            page: 1,
          })
        }
      />

      <AdministratorsTable
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error as Error | null}
        page={params.page}
        limit={params.limit}
        onPageChange={(page) => setQuery({ page })}
        onLimitChange={(limit) => setQuery({ limit, page: 1 })}
        onRetry={() => refetch()}
      />
    </div>
  )
}

export default function AdministratorsPage() {
  return (
    <SuperAdminOnly>
      <AdministratorsPageContent />
    </SuperAdminOnly>
  )
}
