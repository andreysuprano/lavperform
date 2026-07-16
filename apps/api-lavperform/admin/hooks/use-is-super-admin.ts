"use client"

import { useAdminSession } from "@/hooks/use-admin-session"

export function useIsSuperAdmin() {
  const session = useAdminSession()
  return session?.role === "SUPER_ADMIN"
}
