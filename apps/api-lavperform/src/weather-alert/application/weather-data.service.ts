import { Injectable, Logger, Inject } from '@nestjs/common';
import { IWeatherDataRepository } from '../domain/weather-data.repository.interface';
import { WeatherApiService, WeatherApiResponse } from '../infrastructure/api/weather-api.service';
import { normalizeString } from '../../common/utils/normalize-string';

@Injectable()
export class WeatherDataService {
    private readonly logger: Logger;

    constructor(
        @Inject('IWeatherDataRepository')
        private readonly weatherDataRepository: IWeatherDataRepository,
        private readonly weatherApiService: WeatherApiService,
    ) {
        this.logger = new Logger(WeatherDataService.name);
    }

    async fetchAndUpdateWeatherData(cityName: string): Promise<void> {
        this.logger.log(`Atualizando dados do tempo para: ${cityName}`);

        try {
            const weatherData = await this.weatherApiService.getCurrentWeather(cityName);
            await this.saveWeatherData(cityName, weatherData);
            this.logger.log(`Dados do tempo atualizados com sucesso para: ${cityName}`);
        } catch (error) {
            this.logger.error(`Erro ao atualizar dados do tempo para ${cityName}:`, error.message);
            throw error;
        }
    }

    private async saveWeatherData(cityName: string, data: WeatherApiResponse): Promise<void> {
        const normalizedCityName = normalizeString(cityName);
        this.logger.debug(`Salvando dados para cidade: ${normalizedCityName} (API retornou: ${data.location.name})`);
        await this.weatherDataRepository.upsertByCityName(normalizedCityName, {
            cityName: normalizedCityName,
            region: data.location.region,
            country: data.location.country,
            lat: data.location.lat,
            lon: data.location.lon,
            tzId: data.location.tz_id,
            localtimeEpoch: data.location.localtime_epoch,
            localtime: data.location.localtime,
            lastUpdatedEpoch: data.current.last_updated_epoch,
            lastUpdated: data.current.last_updated,
            tempC: data.current.temp_c,
            tempF: data.current.temp_f,
            isDay: data.current.is_day,
            conditionText: data.current.condition.text,
            conditionIcon: data.current.condition.icon,
            conditionCode: data.current.condition.code,
            windMph: data.current.wind_mph,
            windKph: data.current.wind_kph,
            windDegree: data.current.wind_degree,
            windDir: data.current.wind_dir,
            pressureMb: data.current.pressure_mb,
            pressureIn: data.current.pressure_in,
            precipMm: data.current.precip_mm,
            precipIn: data.current.precip_in,
            humidity: data.current.humidity,
            cloud: data.current.cloud,
            feelslikeC: data.current.feelslike_c,
            feelslikeF: data.current.feelslike_f,
            windchillC: data.current.windchill_c,
            windchillF: data.current.windchill_f,
            heatindexC: data.current.heatindex_c,
            heatindexF: data.current.heatindex_f,
            dewpointC: data.current.dewpoint_c,
            dewpointF: data.current.dewpoint_f,
            visKm: data.current.vis_km,
            visMiles: data.current.vis_miles,
            uv: data.current.uv,
            gustMph: data.current.gust_mph,
            gustKph: data.current.gust_kph,
            shortRad: data.current.short_rad,
            diffRad: data.current.diff_rad,
            dni: data.current.dni,
            gti: data.current.gti,
        });
    }

    async getWeatherByCityName(cityName: string) {
        const normalizedCityName = normalizeString(cityName);
        return this.weatherDataRepository.findByCityName(normalizedCityName);
    }

    async getAllUniqueCities(): Promise<string[]> {
        const result = await this.weatherDataRepository.findAll();
        const weatherData = Array.isArray(result) ? result : result.items;
        return [...new Set(weatherData.map(data => data.cityName))];
    }
}
