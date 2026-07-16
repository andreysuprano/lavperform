import { apiClient } from "@/services/api-client"

import type {
  CreateUserInput,
  UpdateUserInput,
} from "./schemas"
import type {
  PaginatedResponse,
  User,
  UserCompanyLink,
  UserListParams,
} from "./types"

function buildQueryString(params: UserListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

export function listUsers(
  params: UserListParams = {}
): Promise<PaginatedResponse<User>> {
  return apiClient<PaginatedResponse<User>>(
    `/admin/users${buildQueryString(params)}`
  )
}

export function getUser(id: string): Promise<User> {
  return apiClient<User>(`/admin/users/${id}`)
}

export function createUser(input: CreateUserInput): Promise<User> {
  return apiClient<User>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiClient<User>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function deleteUser(id: string): Promise<void> {
  return apiClient<void>(`/admin/users/${id}`, { method: "DELETE" })
}

export function changeUserPassword(
  id: string,
  newPassword: string
): Promise<User> {
  return apiClient<User>(`/admin/users/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ newPassword }),
  })
}

export function assignUserToCompany(
  userId: string,
  companyId: string
): Promise<UserCompanyLink> {
  return apiClient<UserCompanyLink>(
    `/admin/users/${userId}/companies/${companyId}`,
    { method: "POST" }
  )
}

export function unassignUserFromCompany(
  userId: string,
  companyId: string
): Promise<void> {
  return apiClient<void>(`/admin/users/${userId}/companies/${companyId}`, {
    method: "DELETE",
  })
}
