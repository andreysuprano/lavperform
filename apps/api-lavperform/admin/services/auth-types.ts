export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminLoginResponse {
  access_token: string
}

export interface AdminJwtPayload {
  adminUserId: string
  adminUserName: string
  adminUserEmail: string
  adminUserAvatarUrl?: string | null
  role: string
  iat: number
  exp: number
}

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super administrador",
  ADMIN: "Administrador",
  SDR: "SDR",
  CLOSER: "Closer",
  REVOPS: "RevOps",
  CSM: "CSM",
  CS: "CS",
}

export interface ApiErrorResponse {
  statusCode: number
  message: string | string[]
  error: string
}
