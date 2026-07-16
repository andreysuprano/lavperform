import type { User } from '@/types'

import { client } from './client'

export const userService = {
  async listUsers(companyId: string) {
    return await client.get<User[]>(`/companies/${companyId}/users`)
  },
}
