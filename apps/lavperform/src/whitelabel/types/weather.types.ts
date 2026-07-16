export type WeatherCondition = 'SUNNY' | 'CLOUDY' | 'RAINING' | 'COLD'

export interface WeatherAutomation {
  whatsapp: boolean
  email: boolean
  messages: Record<WeatherCondition, string>
}

export interface WeatherRule {
  id: string
  condition: WeatherCondition
  threshold: number
  action: string
}

export interface WeatherConfig {
  id: string
  companyId: string
  enabled: boolean
  conditions: WeatherCondition[]
  automations: WeatherAutomation
  rules: WeatherRule[]
  createdAt?: string
  updatedAt?: string
}

export interface WeatherConfigFormData {
  enabled: boolean
  conditions: WeatherCondition[]
  automations: WeatherAutomation
  rules: WeatherRule[]
}

export interface WeatherAlertHistory {
  id: string
  companyId: string
  condition: WeatherCondition
  tempC: number
  tempF: number
  messagesSent: number
  sentAt: string
  createdAt: string
  updatedAt: string
}

export interface WeatherData {
  id: string
  cityName: string
  region: string
  country: string
  lat: number
  lon: number
  tzId: string
  localtimeEpoch: number
  localtime: string
  lastUpdatedEpoch: number
  lastUpdated: string
  tempC: number
  tempF: number
  isDay: number
  conditionText: string
  conditionIcon: string
  conditionCode: number
  windMph: number
  windKph: number
  windDegree: number
  windDir: string
  pressureMb: number
  pressureIn: number
  precipMm: number
  precipIn: number
  humidity: number
  cloud: number
  feelslikeC: number
  feelslikeF: number
  windchillC: number
  windchillF: number
  heatindexC: number
  heatindexF: number
  dewpointC: number
  dewpointF: number
  visKm: number
  visMiles: number
  uv: number
  gustMph: number
  gustKph: number
  shortRad: number
  diffRad: number
  dni: number
  gti: number
  createdAt: string
  updatedAt: string
}

// Tipos para a API real de configuração de alertas
export type WeatherConditionAPI = 'RAINING' | 'SUNNY' | 'CLOUDY' | 'COLD'

export type WeatherAlertMessages = Record<WeatherConditionAPI, string>

export interface WeatherAlertConfig {
  id: string
  companyId: string
  condition: WeatherConditionAPI
  daysOfWeek: string[] // ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
  dailyAlerts: number // 1 a 50
  giftId: string
  messages?: Partial<WeatherAlertMessages>
  active: boolean
  createdAt: string
  updatedAt: string
  company?: {
    id: string
    name: string
    cnpj: string
    email: string
    phone: string
    avatarUrl: string
    addressId: string
    createdAt: string
    updatedAt: string
    slug: string
    businessPartnerId: string | null
    state: string
  }
}

export interface WeatherAlertConfigPayload {
  condition: WeatherConditionAPI
  daysOfWeek: string[]
  dailyAlerts: number
  giftId: string
  messages?: Partial<WeatherAlertMessages>
  active: boolean
}

// Tipos para histórico de envios (detalhado)
export interface WeatherAlertSend {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  date: string
  condition: WeatherCondition
  message: string
  status: 'sent' | 'failed'
  channel: 'whatsapp' | 'email'
  errorMessage?: string
  sentAt?: string
}
