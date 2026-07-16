"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ApiClientError } from "@/services/api-client"
import { setStoredToken } from "@/services/auth-storage"

import { getAdminProfile, updateAdminProfile } from "./profile-api"
import type { UpdateAdminProfileInput } from "./types"

export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function useAdminProfile() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: getAdminProfile,
  })
}

export function useUpdateAdminProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateAdminProfileInput) => updateAdminProfile(input),
    onSuccess: (response) => {
      setStoredToken(response.access_token)
      queryClient.setQueryData(profileKeys.me(), response.profile)
      toast.success("Foto de perfil atualizada")
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Não foi possível atualizar a foto de perfil")
      )
    },
  })
}
