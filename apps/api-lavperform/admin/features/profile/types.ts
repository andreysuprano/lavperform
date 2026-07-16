export type AdminProfile = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: string
}

export type UpdateAdminProfileInput = {
  avatarUrl?: string | null
}

export type UpdateAdminProfileResponse = {
  access_token: string
  profile: AdminProfile
}
