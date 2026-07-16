import {
  AuthArgs,
  AuthResponse,
  ConfirmCodeArgs,
  ForgotPasswordArgs,
} from '@/types'

import { authClient } from './client'

export const authService = {
  async login({ email, password }: AuthArgs) {
    return await authClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
  },

  async forgotPassword({ email }: ForgotPasswordArgs) {
    return await authClient.post('/auth/forgot-password', {
      email,
    })
  },

  async confirmCode({ code, password }: ConfirmCodeArgs) {
    return await authClient.post('/auth/confirm-code', {
      code,
      password,
    })
  },
}
