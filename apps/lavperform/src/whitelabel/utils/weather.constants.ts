import type { WeatherConditionAPI } from '@/whitelabel/types'

export type WeatherAlertMessages = Record<WeatherConditionAPI, string>

export const DEFAULT_WEATHER_ALERT_MESSAGES: WeatherAlertMessages = {
  RAINING:
    'Olá {nome}! 🌧️ Está chovendo hoje e é o momento perfeito para deixar suas roupas limpinhas com a {empresa}! Não deixe a chuva te impedir de ter roupas fresquinhas. 😊',
  SUNNY:
    'Olá {nome}! ☀️ Que dia lindo e ensolarado! Perfeito para lavar suas roupas na {empresa}. Aproveite que vão secar rapidinho! 🌤️',
  COLD: 'Olá {nome}! ❄️ Está friozinho hoje ({temperatura}°C)! Hora de lavar aquelas roupas de inverno na {empresa}. Deixe tudo quentinho e cheirosinho! 🧥',
  CLOUDY:
    'Olá {nome}! ☁️ Dia nublado é dia perfeito para cuidar das suas roupas! A {empresa} está te esperando! 😊',
}

export function mergeWeatherAlertMessages(
  messages?: Partial<WeatherAlertMessages> | null
): WeatherAlertMessages {
  return {
    ...DEFAULT_WEATHER_ALERT_MESSAGES,
    ...messages,
  }
}
