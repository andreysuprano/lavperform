import type { WeatherCondition } from '../types'

/**
 * Mapeamento centralizado de condições climáticas para português
 * Mantém os valores em inglês para consistência com API, mas exibe em PT-BR
 */
export const weatherConditionLabels: Record<WeatherCondition, string> = {
  RAINING: 'Chuva',
  SUNNY: 'Sol Intenso',
  CLOUDY: 'Nublado',
  COLD: 'Frio',
}

/**
 * Retorna o label em português para uma condição climática
 */
export function getWeatherConditionLabel(condition: WeatherCondition): string {
  return weatherConditionLabels[condition] || condition
}
