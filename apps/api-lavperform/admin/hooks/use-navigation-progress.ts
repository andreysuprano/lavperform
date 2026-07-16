"use client"

import { useSyncExternalStore } from "react"

import {
  getNavigationState,
  subscribeNavigation,
} from "@/services/navigation-progress"

export function useNavigationProgress(): boolean {
  return useSyncExternalStore(
    subscribeNavigation,
    () => getNavigationState().isNavigating,
    () => false
  )
}
