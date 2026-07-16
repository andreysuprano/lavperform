"use client"

import { useIsFetching } from "@tanstack/react-query"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useSyncExternalStore } from "react"

import {
  endNavigation,
  getInternalLinkPathname,
  getNavigationMinDurationMs,
  getNavigationState,
  isModifiedNavigationClick,
  startNavigation,
  subscribeNavigation,
} from "@/services/navigation-progress"
import { getPendingRequestCount, subscribePendingRequests } from "@/services/pending-requests"

function usePendingRequests() {
  return useSyncExternalStore(
    subscribePendingRequests,
    getPendingRequestCount,
    () => 0
  )
}

function useIsNavigating() {
  return useSyncExternalStore(
    subscribeNavigation,
    () => getNavigationState().isNavigating,
    () => false
  )
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const fetchingCount = useIsFetching()
  const pendingRequests = usePendingRequests()
  const isNavigating = useIsNavigating()
  const previousPathnameRef = useRef(pathname)
  const endTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (isModifiedNavigationClick(event)) return

      const anchor = (event.target as Element).closest("a")
      if (!anchor) return

      const targetPathname = getInternalLinkPathname(anchor)
      if (!targetPathname || targetPathname === pathname) return

      startNavigation(targetPathname)
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [pathname])

  useEffect(() => {
    if (pathname === previousPathnameRef.current) return

    if (!getNavigationState().isNavigating) {
      startNavigation(pathname)
    }

    previousPathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!isNavigating) return

    if (endTimeoutRef.current !== null) {
      window.clearTimeout(endTimeoutRef.current)
      endTimeoutRef.current = null
    }

    const { startedAt, targetPathname } = getNavigationState()
    if (targetPathname && pathname !== targetPathname) return

    const dataReady = fetchingCount === 0 && pendingRequests === 0
    if (!dataReady) return

    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, getNavigationMinDurationMs() - elapsed)

    const finish = () => {
      endNavigation()
    }

    if (remaining === 0) {
      finish()
      return
    }

    endTimeoutRef.current = window.setTimeout(finish, remaining)

    return () => {
      if (endTimeoutRef.current !== null) {
        window.clearTimeout(endTimeoutRef.current)
        endTimeoutRef.current = null
      }
    }
  }, [fetchingCount, isNavigating, pathname, pendingRequests])

  useEffect(() => {
    if (!isNavigating) return

    const timeout = window.setTimeout(() => {
      endNavigation()
    }, 15_000)

    return () => window.clearTimeout(timeout)
  }, [isNavigating, pathname])

  return children
}
