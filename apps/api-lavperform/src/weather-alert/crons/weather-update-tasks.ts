import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { isWeatherAlertEnabled } from '../weather-alert.config';
import { collectUniqueWeatherLocations } from '../domain/weather-location';

@Injectable()
export class WeatherUpdateTasks {
    private readonly logger = new Logger(WeatherUpdateTasks.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        @InjectQueue(QUEUE_NAMES.WEATHER_UPDATE) private readonly weatherUpdateQueue: Queue
    ) { }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleWeatherUpdate() {
        if (!isWeatherAlertEnabled(this.configService)) {
            this.logger.debug('Funcionalidade de weather alert desabilitada via WEATHER_ALERT_ENABLED, pulando atualização');
            return;
        }

        this.logger.debug('Iniciando atualização de dados meteorológicos');

        try {
            const companies = await this.prisma.company.findMany({
                where: {
                    address: {
                        isNot: null,
                    },
                },
                include: {
                    address: true,
                },
            });

            const uniqueLocations = collectUniqueWeatherLocations(
                companies.map(company => company.address ?? {}),
            );
            this.logger.log(`Encontradas ${uniqueLocations.length} localidades únicas para atualização`);

            for (const location of uniqueLocations) {
                await this.weatherUpdateQueue.add(
                    QUEUE_NAMES.WEATHER_UPDATE,
                    location,
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    }
                );
                this.logger.log(`Localidade ${location.city}/${location.state ?? '-'} adicionada à fila de atualização`);
            }

            this.logger.log(`Total de ${uniqueLocations.length} localidades adicionadas à fila`);
        } catch (error) {
            this.logger.error('Erro ao processar atualização de dados meteorológicos:', error);
        }
    }
}
