import { apiClient } from "@/services/api-client"

import type {
  AdminProfile,
  UpdateAdminProfileInput,
  UpdateAdminProfileResponse,
} from "./types"

export function getAdminProfile(): Promise<AdminProfile> {
  return apiClient<AdminProfile>("/auth/me")
}

export function updateAdminProfile(
  input: UpdateAdminProfileInput
): Promise<UpdateAdminProfileResponse> {
  return apiClient<UpdateAdminProfileResponse>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}
