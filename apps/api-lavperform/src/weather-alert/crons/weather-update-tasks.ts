import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeString } from '../../common/utils/normalize-string';
import { isWeatherAlertEnabled } from '../weather-alert.config';

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
            // Busca todas as cidades únicas dos endereços das empresas
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

            // Extrai cidades únicas (normalizadas)
            const cities = new Set<string>();
            companies.forEach(company => {
                if (company.address?.city) {
                    cities.add(normalizeString(company.address.city));
                }
            });

            const uniqueCities = Array.from(cities);
            this.logger.log(`Encontradas ${uniqueCities.length} cidades únicas para atualização`);

            // Adiciona cada cidade na fila
            for (const cityName of uniqueCities) {
                await this.weatherUpdateQueue.add(
                    QUEUE_NAMES.WEATHER_UPDATE,
                    { cityName },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    }
                );
                this.logger.log(`Cidade ${cityName} adicionada à fila de atualização`);
            }

            this.logger.log(`Total de ${uniqueCities.length} cidades adicionadas à fila`);
        } catch (error) {
            this.logger.error('Erro ao processar atualização de dados meteorológicos:', error);
        }
    }
}
