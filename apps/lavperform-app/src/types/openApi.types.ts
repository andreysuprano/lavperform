export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | string

export interface ApiKey {
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

export interface ApiKeyWithSecret extends ApiKey {
  secret: string
}

export interface ApiKeyRotateResponse {
  id: string
  name: string
  prefix: string
  status: ApiKeyStatus
  expiresAt: string | null
  createdAt: string
  secret: string
}
