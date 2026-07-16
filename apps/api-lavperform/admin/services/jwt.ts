import type { AdminJwtPayload } from "@/services/auth-types"

export function decodeJwtPayload(token: string): AdminJwtPayload | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded) as AdminJwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(payload: AdminJwtPayload): boolean {
  return payload.exp * 1000 <= Date.now()
}

export function isValidToken(token: string): boolean {
  const payload = decodeJwtPayload(token)
  return !!payload && !isTokenExpired(payload)
}
