"use client"

import { useIsFetching, useIsMutating } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"

import { useNavigationProgress } from "@/hooks/use-navigation-progress"
import {
  getPendingRequestCount,
  subscribePendingRequests,
} from "@/services/pending-requests"
import { cn } from "@/lib/utils"

function usePendingRequests() {
  return useSyncExternalStore(
    subscribePendingRequests,
    getPendingRequestCount,
    () => 0
  )
}

export function GlobalLoadingBar() {
  const isNavigating = useNavigationProgress()
  const fetchingCount = useIsFetching()
  const mutatingCount = useIsMutating()
  const pendingRequests = usePendingRequests()

  const isLoading =
    isNavigating ||
    fetchingCount > 0 ||
    mutatingCount > 0 ||
    pendingRequests > 0

  return (
    <div
      aria-hidden={!isLoading}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-transparent transition-opacity duration-200",
        isLoading ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "h-full w-1/3 bg-primary",
          isLoading && "animate-[global-loading_1.1s_ease-in-out_infinite]"
        )}
      />
    </div>
  )
}
