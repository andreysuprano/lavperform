import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { WeatherDataService } from '../../application/weather-data.service';
import { WeatherLocationInput } from '../../domain/weather-location';

@Processor(QUEUE_NAMES.WEATHER_UPDATE)
export class WeatherUpdateProcessor {
    private readonly logger = new Logger(WeatherUpdateProcessor.name);

    constructor(private readonly weatherDataService: WeatherDataService) { }

    @Process(QUEUE_NAMES.WEATHER_UPDATE)
    async process(job: Job<WeatherLocationInput>) {
        const location = job.data;

        try {
            this.logger.log(`Processando atualização do tempo para: ${location.city}`);
            await this.weatherDataService.fetchAndUpdateWeatherData(location);
            this.logger.log(`Atualização concluída para: ${location.city}`);
        } catch (error) {
            this.logger.error(`Erro ao processar atualização do tempo para ${location.city}:`, error.message);
            throw error;
        }
    }
}
