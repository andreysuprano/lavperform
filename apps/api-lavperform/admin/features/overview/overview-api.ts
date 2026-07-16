import { apiClient } from "@/services/api-client"

import type { AdminOverviewStats } from "./types"

export async function getOverviewStats(): Promise<AdminOverviewStats> {
  return apiClient<AdminOverviewStats>("/admin/overview")
}

export async function refreshOverviewStats(): Promise<AdminOverviewStats> {
  return apiClient<AdminOverviewStats>("/admin/overview/refresh", {
    method: "POST",
  })
}
