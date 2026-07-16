import { AUTH_TOKEN_KEY } from "@/services/constants"
import type { AdminJwtPayload } from "@/services/auth-types"
import { decodeJwtPayload, isTokenExpired } from "@/services/jwt"
import { notifyAdminSessionChange } from "@/hooks/use-admin-session"

const TOKEN_COOKIE = "admin_token"

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getStoredSession(): AdminJwtPayload | null {
  const token = getStoredToken()
  if (!token) return null

  const payload = decodeJwtPayload(token)
  if (!payload || isTokenExpired(payload)) {
    clearStoredToken()
    return null
  }

  return payload
}

export function setStoredToken(token: string): AdminJwtPayload | null {
  const payload = decodeJwtPayload(token)
  if (!payload) return null

  localStorage.setItem(AUTH_TOKEN_KEY, token)

  const maxAge = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0)
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`

  notifyAdminSessionChange()
  return payload
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return

  localStorage.removeItem(AUTH_TOKEN_KEY)
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  notifyAdminSessionChange()
}

export { TOKEN_COOKIE }
