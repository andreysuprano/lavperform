import { ConfigService } from '@nestjs/config';

/**
 * Verifica se a funcionalidade de weather alert está habilitada via env.
 * A flag WEATHER_ALERT_ENABLED só desabilita quando explicitamente setada como
 * 'false' (case-insensitive) ou '0'. Caso contrário, considera habilitada por padrão
 * para manter retrocompatibilidade com ambientes que ainda não definiram a variável.
 */
export function isWeatherAlertEnabled(configService?: ConfigService): boolean {
    const raw = configService?.get<string>('WEATHER_ALERT_ENABLED') ?? process.env.WEATHER_ALERT_ENABLED;

    if (raw === undefined || raw === null || raw === '') {
        return true;
    }

    const normalized = String(raw).trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'no' && normalized !== 'off';
}
