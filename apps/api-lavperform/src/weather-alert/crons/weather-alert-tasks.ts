import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { WeatherAlertHistoryService } from '../application/weather-alert-history.service';
import { isWeatherAlertEnabled } from '../weather-alert.config';

@Injectable()
export class WeatherAlertTasks {
    private readonly logger = new Logger(WeatherAlertTasks.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly weatherAlertHistoryService: WeatherAlertHistoryService,
        @InjectQueue(QUEUE_NAMES.WEATHER_ALERT_PROCESSOR) private readonly weatherAlertQueue: Queue
    ) { }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleWeatherAlerts() {
        if (!isWeatherAlertEnabled(this.configService)) {
            this.logger.debug('Funcionalidade de weather alert desabilitada via WEATHER_ALERT_ENABLED, pulando processamento');
            return;
        }

        this.logger.debug('Processando alertas de clima');

        try {
            // Dia da semana atual (seg, ter, qua, etc)
            const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
            const currentDay = daysOfWeek[new Date().getDay()];

            this.logger.log(`Dia da semana atual: ${currentDay}`);

            // Busca empresas ativas com alertas configurados para hoje
            const companies = await this.prisma.company.findMany({
                where: {
                    state: 'ACTIVE',
                    weatherAlert: {
                        active: true,
                        daysOfWeek: {
                            has: currentDay,
                        },
                    },
                },
                include: {
                    weatherAlert: true,
                    address: true,
                },
            });

            this.logger.log(`Encontradas ${companies.length} empresas com alertas ativos para hoje`);

            // Processa cada empresa
            for (const company of companies) {
                // Verifica se já foi enviado alerta hoje
                const hasAlertToday = await this.weatherAlertHistoryService.hasAlertTodayForCompany(company.id);

                if (hasAlertToday) {
                    this.logger.log(`Empresa ${company.name} já recebeu alerta hoje, pulando...`);
                    continue;
                }

                // Adiciona na fila para processar
                await this.weatherAlertQueue.add(
                    QUEUE_NAMES.WEATHER_ALERT_PROCESSOR,
                    { companyId: company.id },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    }
                );

                this.logger.log(`Empresa ${company.name} adicionada à fila de alertas`);
            }

            this.logger.log(`Total de ${companies.length} empresas processadas`);
        } catch (error) {
            this.logger.error('Erro ao processar alertas de clima:', error);
        }
    }
}
