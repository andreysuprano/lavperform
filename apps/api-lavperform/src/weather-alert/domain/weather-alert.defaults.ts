import { WeatherCondition } from './weather-alert.entity';

export const DEFAULT_WEATHER_ALERT_CONFIG = {
    condition: WeatherCondition.RAINING,
    daysOfWeek: ['seg', 'ter', 'qua', 'qui', 'sex'],
    dailyAlerts: 1,
    active: false,
} as const;
