"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CompaniesFilters } from "@/features/companies/components/companies-filters"
import { CompaniesTable } from "@/features/companies/components/companies-table"
import { DeleteCompanyDialog } from "@/features/companies/components/delete-company-dialog"
import {
  useCompanies,
  useDeleteCompany,
  useUpdateCompanyState,
} from "@/features/companies/companies-queries"
import type {
  Company,
  CompanyListParams,
  CompanyStatus,
} from "@/features/companies/types"
import { COMPANY_STATUS_VALUES } from "@/features/companies/types"

type CompanyFilters = Pick<
  CompanyListParams,
  "name" | "state" | "startDate" | "endDate"
>

function parseSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "20")
  const orderBy = searchParams.get("orderBy") ?? "createdAt"
  const orderDirection: "asc" | "desc" =
    searchParams.get("orderDirection") === "asc" ? "asc" : "desc"
  const name = searchParams.get("name") ?? undefined
  const stateParam = searchParams.get("state")
  const state =
    stateParam && (COMPANY_STATUS_VALUES as string[]).includes(stateParam)
      ? (stateParam as CompanyStatus)
      : undefined
  const startDate = searchParams.get("startDate") ?? undefined
  const endDate = searchParams.get("endDate") ?? undefined

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    orderBy,
    orderDirection,
    name,
    state,
    startDate,
    endDate,
  }
}

export default function CompaniesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const params = useMemo(
    () => parseSearchParams(searchParams),
    [searchParams]
  )

  const { data, isLoading, isFetching, error, refetch } = useCompanies(params)

  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const deleteMutation = useDeleteCompany()
  const stateMutation = useUpdateCompanyState()

  const setQuery = useCallback(
    (next: Partial<CompanyListParams>) => {
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
      router.replace(qs ? `/companies?${qs}` : "/companies", { scroll: false })
    },
    [params, router, searchParams]
  )

  const handleChangeFilters = useCallback(
    (next: CompanyFilters) => {
      setQuery({ ...next, page: 1 })
    },
    [setQuery]
  )

  const handleClearFilters = useCallback(() => {
    setQuery({
      name: undefined,
      state: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1,
    })
  }, [setQuery])

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Empresas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as empresas da plataforma.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/companies/new" />}>
          <PlusIcon />
          Nova empresa
        </Button>
      </div>

      <CompaniesFilters
        values={{
          name: params.name,
          state: params.state,
          startDate: params.startDate,
          endDate: params.endDate,
        }}
        onChange={handleChangeFilters}
        onClear={handleClearFilters}
      />

      <CompaniesTable
        data={data?.items ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error as Error | null}
        page={params.page}
        limit={params.limit}
        orderBy={params.orderBy}
        orderDirection={params.orderDirection}
        onPageChange={(page) => setQuery({ page })}
        onLimitChange={(limit) => setQuery({ limit, page: 1 })}
        onSortChange={(orderBy, orderDirection) =>
          setQuery({ orderBy, orderDirection, page: 1 })
        }
        onChangeState={(company, state) =>
          stateMutation.mutate({ id: company.id, state })
        }
        onDelete={(company) => setCompanyToDelete(company)}
        onRetry={() => refetch()}
      />

      <DeleteCompanyDialog
        open={Boolean(companyToDelete)}
        onOpenChange={(open) => {
          if (!open) setCompanyToDelete(null)
        }}
        companyName={companyToDelete?.name}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!companyToDelete) return
          deleteMutation.mutate(companyToDelete.id, {
            onSuccess: () => setCompanyToDelete(null),
          })
        }}
      />
    </div>
  )
}
