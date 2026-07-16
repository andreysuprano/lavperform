import { ADMIN_API_URL } from "@/services/constants"

import type {
  PublicConnectConnection,
  PublicConnectSession,
  PublicConnectStatus,
} from "./types"

async function publicFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${ADMIN_API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(". ")
          : "Não foi possível carregar os dados"
    throw new Error(message)
  }

  return data as T
}

export function getPublicConnectSession(
  token: string
): Promise<PublicConnectSession> {
  return publicFetch<PublicConnectSession>(
    `/public/whatsapp/connect/${encodeURIComponent(token)}`
  )
}

export function getPublicConnectConnection(
  token: string
): Promise<PublicConnectConnection> {
  return publicFetch<PublicConnectConnection>(
    `/public/whatsapp/connect/${encodeURIComponent(token)}/connection`
  )
}

export function getPublicConnectStatus(
  token: string
): Promise<PublicConnectStatus> {
  return publicFetch<PublicConnectStatus>(
    `/public/whatsapp/connect/${encodeURIComponent(token)}/status`
  )
}
