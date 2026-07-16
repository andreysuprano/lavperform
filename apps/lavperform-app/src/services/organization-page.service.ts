import { client } from './client'

export const organizationPageService = {
  async getBySlug(slug: string) {
    try {
      const response = await client.get(`/link-page/${slug}`)
      return response.data
    } catch (error) {
      console.error('❌ Erro no linkPageService.getBySlug:', error)
      throw error
    }
  },
  async createOrUpdate(payload: any) {
    try {
      const slug = payload.slug

      if (!slug) {
        console.error('❌ Nenhum slug fornecido pelo backend.')
        throw new Error('Slug é obrigatório e deve vir do backend.')
      }

      const response = await client.put(`/link-page/${slug}`, payload)

      return response.data
    } catch (error) {
      console.error('❌ Erro no linkPageService.createOrUpdate:', error)
      throw error
    }
  },
  async deleteLink(id: string) {
    try {
      if (!id) throw new Error('❌ ID do link não informado')
      const response = await client.delete(`/link-page/link/${id}`)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao deletar link:', error)
      throw error
    }
  },
}
