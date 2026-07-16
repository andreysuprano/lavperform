import { client } from '@/services/client'
import type {
  WeatherAlertHistory,
  WeatherConfig,
  WeatherConfigFormData,
  WeatherData,
  WeatherAlertConfig,
  WeatherAlertConfigPayload,
} from '@/whitelabel/types'

export const weatherService = {
  /**
   * Busca a configuração de clima e tempo para uma empresa
   * Endpoint planejado para o backend real
   */
  async getConfig(companyId: string) {
    return await client.get<WeatherConfig>(
      `/whitelabel/companies/${companyId}/weather/config`
    )
  },

  /**
   * Atualiza a configuração de clima e tempo
   * Endpoint planejado para o backend real
   */
  async updateConfig(
    companyId: string,
    data: Partial<WeatherConfigFormData>
  ) {
    return await client.patch<WeatherConfig>(
      `/whitelabel/companies/${companyId}/weather/config`,
      data
    )
  },

  /**
   * Busca dados de clima de uma API externa
   * Endpoint planejado para integração futura com API de clima
   */
  async getWeatherData(companyId: string) {
    return await client.get<{
      temperature: number
      humidity: number
      rainProbability: number
      condition: string
    }>(`/whitelabel/companies/${companyId}/weather/data`)
  },

  /**
   * Busca histórico de alertas enviados
   * Endpoint planejado para o backend real
   */
  async getHistory(companyId: string) {
    return await client.get<WeatherAlertHistory[]>(
      `/whitelabel/companies/${companyId}/weather/history`
    )
  },

  async getCurrentWeather(companyId: string) {
    return await client.get<WeatherData>(
      `/weather-alert/company/${companyId}/weather`
    )
  },

  /**
   * Ativa ou desativa os alertas de clima para uma empresa
   * Endpoint real do backend
   */
  async toggleWeatherAlert(companyId: string, active: boolean) {
    return await client.patch<{ active: boolean }>(
      `/weather-alert/company/${companyId}/toggle`,
      { active }
    )
  },

  /**
   * Busca o histórico de alertas enviados
   * Endpoint real do backend
   */
  async getAlertHistory(companyId: string) {
    return await client.get<WeatherAlertHistory[]>(
      `/weather-alert/company/${companyId}/history`
    )
  },

  /**
   * Busca a configuração de alertas de clima da empresa
   * Endpoint real do backend
   */
  async getWeatherAlertConfig(companyId: string) {
    return await client.get<WeatherAlertConfig>(
      `/weather-alert/company/${companyId}`
    )
  },

  /**
   * Cria ou atualiza a configuração de alertas de clima
   * Endpoint real do backend
   */
  async saveWeatherAlertConfig(
    companyId: string,
    data: WeatherAlertConfigPayload
  ) {
    return await client.post<WeatherAlertConfig>(
      `/weather-alert/company/${companyId}`,
      data
    )
  },
}
