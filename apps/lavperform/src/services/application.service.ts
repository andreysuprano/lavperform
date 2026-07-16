import type {
  ApplicationPreloadResponse,
  RedirectResponse,
} from '@/types'

import { client } from './client'

export const applicationService = {
  /**
   * Carrega dados necessários para o carregamento da aplicação (ex.: empresas do usuário).
   * Usa apenas o token no header; evita payload de empresas no JWT.
   */
  async getPreload() {
    return await client.get<ApplicationPreloadResponse>('/application/preload')
  },
}

export const messageRedirectService = {
  async getMessageRedirect(token: string) {
    return await client.post<RedirectResponse>(`/metrics/interaction/${token}`)
  },
}
