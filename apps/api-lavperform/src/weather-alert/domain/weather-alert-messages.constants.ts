import { WeatherCondition } from './weather-alert.entity';

export type WeatherAlertMessages = Record<WeatherCondition, string>;

export const DEFAULT_WEATHER_ALERT_MESSAGES: WeatherAlertMessages = {
    [WeatherCondition.RAINING]:
        'Olá {nome}! 🌧️ Está chovendo hoje e é o momento perfeito para deixar suas roupas limpinhas com a {empresa}! Não deixe a chuva te impedir de ter roupas fresquinhas. 😊',
    [WeatherCondition.SUNNY]:
        'Olá {nome}! ☀️ Que dia lindo e ensolarado! Perfeito para lavar suas roupas na {empresa}. Aproveite que vão secar rapidinho! 🌤️',
    [WeatherCondition.COLD]:
        'Olá {nome}! ❄️ Está friozinho hoje ({temperatura}°C)! Hora de lavar aquelas roupas de inverno na {empresa}. Deixe tudo quentinho e cheirosinho! 🧥',
    [WeatherCondition.CLOUDY]:
        'Olá {nome}! ☁️ Dia nublado é dia perfeito para cuidar das suas roupas! A {empresa} está te esperando! 😊',
};

export function resolveWeatherAlertMessage(
    messages: Partial<WeatherAlertMessages> | null | undefined,
    condition: WeatherCondition,
    variables: { customerName: string; companyName: string; tempC: number },
): string {
    const template = messages?.[condition] || DEFAULT_WEATHER_ALERT_MESSAGES[condition];

    return template
        .replace(/{nome}/g, variables.customerName)
        .replace(/{empresa}/g, variables.companyName)
        .replace(/{temperatura}/g, String(variables.tempC));
}
