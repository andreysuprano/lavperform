import { client } from './client'

export type PixelRecord = {
  pixelId: string | null
  enabled: boolean
}

export type GtmRecord = {
  containerId: string | null
  enabled: boolean
}

export type TrackingCodeBody = {
  baseCode?: string
  enabled?: boolean
}

export const trafficService = {
  async getPixel(companyId: string) {
    const response = await client.get<PixelRecord>(
      `/companies/${companyId}/traffic/pixel`
    )
    return response.data
  },
  async savePixel(companyId: string, body: TrackingCodeBody) {
    const response = await client.put<PixelRecord>(
      `/companies/${companyId}/traffic/pixel`,
      body
    )
    return response.data
  },
  async removePixel(companyId: string) {
    await client.delete(`/companies/${companyId}/traffic/pixel`)
  },
  async getGtm(companyId: string) {
    const response = await client.get<GtmRecord>(
      `/companies/${companyId}/traffic/gtm`
    )
    return response.data
  },
  async saveGtm(companyId: string, body: TrackingCodeBody) {
    const response = await client.put<GtmRecord>(
      `/companies/${companyId}/traffic/gtm`,
      body
    )
    return response.data
  },
  async removeGtm(companyId: string) {
    await client.delete(`/companies/${companyId}/traffic/gtm`)
  },
}
