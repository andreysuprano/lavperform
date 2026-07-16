export type ApiKeyStatus = "ACTIVE" | "REVOKED" | "EXPIRED"

export interface PublicApiKey {
  id: string
  name: string
  prefix: string
  status: ApiKeyStatus
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePublicApiKeyInput {
  name?: string
  expiresAt?: string
}

export interface CreatePublicApiKeyResponse extends PublicApiKey {
  secret: string
}
