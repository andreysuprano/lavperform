"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import { getOverviewStats, refreshOverviewStats } from "./overview-api"

const OVERVIEW_STALE_MS = 2 * 60 * 60 * 1000

export const overviewKeys = {
  all: ["overview"] as const,
  stats: () => [...overviewKeys.all, "stats"] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useOverviewStats() {
  return useQuery({
    queryKey: overviewKeys.stats(),
    queryFn: getOverviewStats,
    staleTime: OVERVIEW_STALE_MS,
    refetchOnWindowFocus: false,
  })
}

export function useRefreshOverviewStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshOverviewStats,
    onSuccess: (data) => {
      queryClient.setQueryData(overviewKeys.stats(), data)
      toast.success("Métricas atualizadas")
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Erro ao atualizar métricas")),
  })
}
