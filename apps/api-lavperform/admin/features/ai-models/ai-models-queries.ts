"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"

import { getAiModels, saveAiModels } from "./ai-models-api"
import type { SaveAiModelsInput } from "./types"

export const aiModelKeys = {
  all: ["ai-models"] as const,
  view: () => [...aiModelKeys.all, "view"] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useAiModels() {
  return useQuery({
    queryKey: aiModelKeys.view(),
    queryFn: getAiModels,
  })
}

export function useSaveAiModels() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SaveAiModelsInput) => saveAiModels(input),
    onSuccess: (view) => {
      queryClient.setQueryData(aiModelKeys.view(), view)
      toast.success("Modelos atualizados. A geração passa a usar essa escolha.")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Não foi possível salvar os modelos"))
    },
  })
}
