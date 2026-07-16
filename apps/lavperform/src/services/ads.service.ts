import { EMBED_TOKEN_STORAGE_KEY, EMBED_TOKEN_UPDATE_EVENT } from '@/constants/embedTokenStorage'

import { client } from './client'

type EmbedTokenBody = {
  token?: string
  embedToken?: string
  access_token?: string
  embed_token?: string
}

function pickTokenFromPayload(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === 'string') {
    const t = data.trim()
    return t || null
  }
  if (typeof data === 'object') {
    const o = data as EmbedTokenBody
    const raw = o.token ?? o.embedToken ?? o.access_token ?? o.embed_token
    if (typeof raw === 'string') {
      const t = raw.trim()
      return t || null
    }
  }
  return null
}

export const adsService = {
  /**
   * Obtém o token de embed para a empresa e persiste em {@link EMBED_TOKEN_STORAGE_KEY}.
   * Em falha de rede ou resposta inválida, remove o valor armazenado.
   */
  async syncEmbedToken(companyId: string): Promise<void> {
    try {
      const { data } = await client.post<unknown>('/ads/embed-token', {
        companyId,
      })
      const token = pickTokenFromPayload(data)
      if (token) {
        localStorage.setItem(EMBED_TOKEN_STORAGE_KEY, token)
      } else {
        localStorage.removeItem(EMBED_TOKEN_STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(EMBED_TOKEN_STORAGE_KEY)
    }
    window.dispatchEvent(new Event(EMBED_TOKEN_UPDATE_EVENT))
  },

  clearStoredEmbedToken() {
    localStorage.removeItem(EMBED_TOKEN_STORAGE_KEY)
    window.dispatchEvent(new Event(EMBED_TOKEN_UPDATE_EVENT))
  },
}
