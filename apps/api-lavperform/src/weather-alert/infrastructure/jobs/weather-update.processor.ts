import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { WeatherDataService } from '../../application/weather-data.service';

@Processor(QUEUE_NAMES.WEATHER_UPDATE)
export class WeatherUpdateProcessor {
    private readonly logger = new Logger(WeatherUpdateProcessor.name);

    constructor(private readonly weatherDataService: WeatherDataService) { }

    @Process(QUEUE_NAMES.WEATHER_UPDATE)
    async process(job: Job<{ cityName: string }>) {
        const { cityName } = job.data;

        try {
            this.logger.log(`Processando atualização do tempo para: ${cityName}`);
            await this.weatherDataService.fetchAndUpdateWeatherData(cityName);
            this.logger.log(`Atualização concluída para: ${cityName}`);
        } catch (error) {
            this.logger.error(`Erro ao processar atualização do tempo para ${cityName}:`, error.message);
            throw error;
        }
    }
}
