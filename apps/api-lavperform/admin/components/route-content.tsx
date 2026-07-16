"use client"

import { AdminPageLoading } from "@/components/admin-page-loading"
import { useNavigationProgress } from "@/hooks/use-navigation-progress"

export function RouteContent({ children }: { children: React.ReactNode }) {
  const isNavigating = useNavigationProgress()

  if (isNavigating) {
    return <AdminPageLoading />
  }

  return children
}
