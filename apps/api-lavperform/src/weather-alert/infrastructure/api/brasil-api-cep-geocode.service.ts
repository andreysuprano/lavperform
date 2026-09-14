import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    digitsOnlyCep,
    isValidBrazilianCep,
    parseBrasilApiCoordinates,
} from '../../domain/weather-location';

@Injectable()
export class BrasilApiCepGeocodeService {
    private readonly logger = new Logger(BrasilApiCepGeocodeService.name);

    constructor(private readonly httpService: HttpService) {}

    async resolveCoordinates(
        zipCode: string,
    ): Promise<{ lat: number; lon: number } | null> {
        if (!isValidBrazilianCep(zipCode)) {
            return null;
        }

        const cep = digitsOnlyCep(zipCode);

        try {
            const response = await firstValueFrom(
                this.httpService.get(`https://brasilapi.com.br/api/cep/v2/${cep}`),
            );
            return parseBrasilApiCoordinates(response.data);
        } catch (error) {
            this.logger.warn(
                `Falha ao geocodificar CEP ${cep}: ${error?.message ?? error}`,
            );
            return null;
        }
    }
}
