import type {
  CreateMetaTemplatePayload,
  MetaMessageTemplate,
  MetaTemplateSyncAllResult,
  MetaTemplateSyncResult,
} from '@/types/metaTemplate.types'

import { client } from './client'

export const metaTemplatesService = {
  async list(companyId: string) {
    return await client.get<MetaMessageTemplate[]>(
      `/companies/${companyId}/meta-templates`
    )
  },

  async create(companyId: string, payload: CreateMetaTemplatePayload) {
    return await client.post<MetaMessageTemplate>(
      `/companies/${companyId}/meta-templates`,
      payload
    )
  },

  async update(
    companyId: string,
    templateId: string,
    payload: CreateMetaTemplatePayload
  ) {
    return await client.patch<MetaMessageTemplate>(
      `/companies/${companyId}/meta-templates/${templateId}`,
      payload
    )
  },

  async syncStatus(companyId: string, templateId: string) {
    return await client.get<MetaTemplateSyncResult>(
      `/companies/${companyId}/meta-templates/${templateId}/sync`
    )
  },

  async syncAll(companyId: string) {
    return await client.post<MetaTemplateSyncAllResult>(
      `/companies/${companyId}/meta-templates/sync-all`
    )
  },
}
