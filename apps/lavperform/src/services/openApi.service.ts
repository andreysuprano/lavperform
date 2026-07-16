import type { ApiKeyRotateResponse, ApiKeyWithSecret } from '@/types'

import { client } from './client'

export const openApiService = {
  async getActiveApiKey(companyId: string) {
    return await client.get<ApiKeyWithSecret>(
      `/companies/${companyId}/api-keys/active`
    )
  },

  async rotateApiKey(companyId: string) {
    return await client.post<ApiKeyRotateResponse>(
      `/companies/${companyId}/api-keys/rotate`
    )
  },
}
