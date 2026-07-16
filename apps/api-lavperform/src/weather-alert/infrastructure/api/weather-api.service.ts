import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { normalizeString } from '../../../common/utils/normalize-string';

export interface WeatherApiResponse {
    location: {
        name: string;
        region: string;
        country: string;
        lat: number;
        lon: number;
        tz_id: string;
        localtime_epoch: number;
        localtime: string;
    };
    current: {
        last_updated_epoch: number;
        last_updated: string;
        temp_c: number;
        temp_f: number;
        is_day: number;
        condition: {
            text: string;
            icon: string;
            code: number;
        };
        wind_mph: number;
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        pressure_in: number;
        precip_mm: number;
        precip_in: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        feelslike_f: number;
        windchill_c: number;
        windchill_f: number;
        heatindex_c: number;
        heatindex_f: number;
        dewpoint_c: number;
        dewpoint_f: number;
        vis_km: number;
        vis_miles: number;
        uv: number;
        gust_mph: number;
        gust_kph: number;
        short_rad: number;
        diff_rad: number;
        dni: number;
        gti: number;
    };
}

@Injectable()
export class WeatherApiService {
    private readonly logger = new Logger(WeatherApiService.name);
    private readonly apiKey: string;
    private readonly baseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('WEATHER_API_KEY') ?? '';
        this.baseUrl = this.configService.get<string>('WEATHER_API_URL') ?? '';
    }

    async getCurrentWeather(city: string): Promise<WeatherApiResponse> {
        try {
            const normalizedCity = normalizeString(city);
            this.logger.log(`Buscando dados do tempo para: ${city} (normalizado: ${normalizedCity})`);

            const url = `${this.baseUrl}/current.json`;
            const params = {
                q: normalizedCity,
                key: this.apiKey,
            };

            const response = await firstValueFrom(
                this.httpService.get<WeatherApiResponse>(url, { params })
            );

            this.logger.log(`Dados do tempo obtidos com sucesso para: ${city}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Erro ao buscar dados do tempo para ${city}:`, error.response?.data || error.message);
            throw error;
        }
    }
}
