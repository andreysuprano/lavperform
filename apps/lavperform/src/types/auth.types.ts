export interface AuthArgs {
  email: string
  password: string
}
export interface AuthResponse {
  access_token: string
}

export interface ForgotPasswordArgs {
  email: string
}

export interface ConfirmCodeArgs {
  code: string
  password: string
}

export interface UserCompany {
  id: string
  name: string
  avatarUrl: string
  slug: string
  companyId: string
}

export interface User {
  userId: string
  userName: string
  userEmail: string
  companyId: string
  companyName: string
  companyAvatar: string | null
  companies: UserCompany[]
  accessRules: string[]
  iat: number
  exp: number
}
