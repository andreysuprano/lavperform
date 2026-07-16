"use client"

import { useSyncExternalStore } from "react"

import type { AdminJwtPayload } from "@/services/auth-types"
import { getStoredSession, getStoredToken } from "@/services/auth-storage"

let cachedSnapshot: AdminJwtPayload | null = null
let cachedToken: string | null | undefined

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener("admin-session-change", onStoreChange)
  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener("admin-session-change", onStoreChange)
  }
}

function getSnapshot(): AdminJwtPayload | null {
  const token = getStoredToken()

  if (token === cachedToken) {
    return cachedSnapshot
  }

  cachedToken = token
  cachedSnapshot = getStoredSession()
  return cachedSnapshot
}

function getServerSnapshot(): AdminJwtPayload | null {
  return null
}

export function useAdminSession() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function notifyAdminSessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin-session-change"))
  }
}
