import { Injectable, Logger, Inject } from '@nestjs/common';
import { IWeatherDataRepository } from '../domain/weather-data.repository.interface';
import { WeatherApiService, WeatherApiResponse } from '../infrastructure/api/weather-api.service';
import { BrasilApiCepGeocodeService } from '../infrastructure/api/brasil-api-cep-geocode.service';
import { normalizeString } from '../../common/utils/normalize-string';
import {
    buildCoordinateQuery,
    buildLocationKey,
    buildTextWeatherQuery,
    isValidBrazilianCep,
    WeatherLocationInput,
} from '../domain/weather-location';

@Injectable()
export class WeatherDataService {
    private readonly logger: Logger;

    constructor(
        @Inject('IWeatherDataRepository')
        private readonly weatherDataRepository: IWeatherDataRepository,
        private readonly weatherApiService: WeatherApiService,
        private readonly cepGeocodeService: BrasilApiCepGeocodeService,
    ) {
        this.logger = new Logger(WeatherDataService.name);
    }

    async fetchAndUpdateWeatherData(location: WeatherLocationInput): Promise<void> {
        this.logger.log(`Atualizando dados do tempo para: ${location.city}`);

        try {
            const weatherData = await this.fetchWeatherWithFallback(location);
            await this.saveWeatherData(location, weatherData);
            this.logger.log(`Dados do tempo atualizados com sucesso para: ${location.city}`);
        } catch (error) {
            this.logger.error(`Erro ao atualizar dados do tempo para ${location.city}:`, error.message);
            throw error;
        }
    }

    private async fetchWeatherWithFallback(location: WeatherLocationInput): Promise<WeatherApiResponse> {
        const queries: string[] = [];

        if (isValidBrazilianCep(location.zipCode)) {
            const coords = await this.cepGeocodeService.resolveCoordinates(location.zipCode as string);
            if (coords) {
                queries.push(buildCoordinateQuery(coords.lat, coords.lon));
            }
        }

        const textQuery = buildTextWeatherQuery(location);
        if (!queries.includes(textQuery)) {
            queries.push(textQuery);
        }

        const cityOnlyQuery = buildTextWeatherQuery({ city: location.city });
        if (!queries.includes(cityOnlyQuery)) {
            queries.push(cityOnlyQuery);
        }

        let lastError: unknown;
        for (const query of queries) {
            try {
                this.logger.debug(`Consultando WeatherAPI com q=${query}`);
                return await this.weatherApiService.getCurrentWeather(query);
            } catch (error) {
                lastError = error;
                this.logger.warn(`Falha na query meteorológica "${query}": ${error?.message ?? error}`);
            }
        }

        throw lastError;
    }

    private async saveWeatherData(location: WeatherLocationInput, data: WeatherApiResponse): Promise<void> {
        const locationKey = buildLocationKey(location.city, location.state);
        const cityName = normalizeString(location.city);
        const state = location.state?.trim()
            ? normalizeString(location.state).toUpperCase()
            : null;

        this.logger.debug(
            `Salvando dados para ${locationKey} (API retornou: ${data.location.name})`,
        );

        await this.weatherDataRepository.upsertByLocationKey(locationKey, {
            locationKey,
            cityName,
            state,
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

    async getWeatherByLocation(cityName: string, state?: string | null) {
        const locationKey = buildLocationKey(cityName, state);
        return this.weatherDataRepository.findByLocationKey(locationKey);
    }
}
