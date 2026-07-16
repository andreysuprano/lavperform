import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WeatherAlertHistoryService } from '../../application/weather-alert-history.service';
import { WeatherDataService } from '../../application/weather-data.service';
import { WeatherCondition } from '../../domain/weather-alert.entity';
import { resolveWeatherAlertMessage } from '../../domain/weather-alert-messages.constants';
import { CampaignChannel, MessageStatus } from '@prisma/client';
import { normalizeString } from '../../../common/utils/normalize-string';
import { RenitencyEvaluatorService } from '../../../renitency/application/renitency-evaluator.service';

@Processor(QUEUE_NAMES.WEATHER_ALERT_PROCESSOR)
export class WeatherAlertProcessor {
    private readonly logger = new Logger(WeatherAlertProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly weatherAlertHistoryService: WeatherAlertHistoryService,
        private readonly weatherDataService: WeatherDataService,
        @InjectQueue(QUEUE_NAMES.MESSAGE_ENGINE) private readonly messageQueue: Queue,
        private readonly renitencyEvaluator: RenitencyEvaluatorService,
    ) { }

    @Process(QUEUE_NAMES.WEATHER_ALERT_PROCESSOR)
    async process(job: Job<{ companyId: string }>) {
        const { companyId } = job.data;

        try {
            this.logger.log(`Processando alerta de clima para empresa: ${companyId}`);

            // Busca empresa com configurações
            const company = await this.prisma.company.findUnique({
                where: { id: companyId },
                include: {
                    weatherAlert: true,
                    address: true,
                },
            });

            if (!company || !company.weatherAlert || !company.address?.city) {
                this.logger.warn(`Empresa ${companyId} sem configuração válida`);
                return;
            }

            // Busca dados meteorológicos da cidade
            const cityName = normalizeString(company.address.city);
            const weatherData = await this.weatherDataService.getWeatherByCityName(cityName);

            if (!weatherData) {
                this.logger.warn(`Dados meteorológicos não encontrados para ${cityName}`);
                return;
            }

            // Verifica se a condição atual corresponde à configurada
            const currentCondition = this.getWeatherCondition(weatherData);
            if (currentCondition !== company.weatherAlert.condition) {
                this.logger.log(
                    `Condição atual (${currentCondition}) não corresponde à configurada (${company.weatherAlert.condition})`
                );
                return;
            }

            const candidates = await this.prisma.customer.findMany({
                where: {
                    companyId: company.id,
                    whatsappOptin: true,
                },
                orderBy: { lastContactDate: 'asc' },
                take: company.weatherAlert.dailyAlerts * 5,
            });

            const customers: typeof candidates = [];
            for (const candidate of candidates) {
                const { allowed } = await this.renitencyEvaluator.canContactCustomer({
                    companyId: company.id,
                    customerId: candidate.id,
                    channel: CampaignChannel.WHATSAPP_WEB,
                    weatherAlertHistoryId: 'pending',
                });
                if (allowed) {
                    customers.push(candidate);
                    if (customers.length >= company.weatherAlert.dailyAlerts) break;
                }
            }

            this.logger.log(`Encontrados ${customers.length} clientes elegíveis (de ${candidates.length} candidatos) para envio de alertas`);

            if (customers.length === 0) {
                this.logger.log('Nenhum cliente elegível para receber alertas');
                return;
            }

            // Cria histórico do alerta
            const history = await this.weatherAlertHistoryService.createHistory({
                companyId: company.id,
                condition: currentCondition,
                tempC: weatherData.tempC,
                tempF: weatherData.tempF,
                messagesSent: customers.length,
            });

            // Cria mensagens para cada cliente
            for (const customer of customers) {
                if (!customer.phone) {
                    continue;
                }

                const personalizedMessage = resolveWeatherAlertMessage(
                    company.weatherAlert.messages as Record<string, string> | null,
                    currentCondition,
                    {
                        customerName: customer.name,
                        companyName: company.name,
                        tempC: weatherData.tempC,
                    },
                );

                const message = await this.prisma.message.create({
                    data: {
                        customerId: customer.id,
                        companyId: company.id,
                        weatherAlertHistoryId: history.id,
                        messageText: personalizedMessage,
                        customerName: customer.name,
                        phone: customer.phone,
                        segmentation: 'weather-alert',
                        status: MessageStatus.PROCESSING,
                        attempts: 0,
                    },
                });

                // Adiciona na fila de mensagens
                await this.messageQueue.add(QUEUE_NAMES.MESSAGE_ENGINE, {
                    message,
                    customer,
                    company,
                });

                this.logger.log(`Mensagem criada para cliente: ${customer.name}`);
            }

            this.logger.log(`Alerta processado com sucesso para empresa: ${company.name}`);
        } catch (error) {
            this.logger.error(`Erro ao processar alerta para empresa ${companyId}:`, error.message);
            throw error;
        }
    }

    private getWeatherCondition(weatherData: any): WeatherCondition {
        // Verifica se está chovendo
        if (weatherData.precipMm > 0 || weatherData.conditionText.toLowerCase().includes('rain')) {
            return WeatherCondition.RAINING;
        }

        // Verifica se está frio (abaixo de 15°C)
        if (weatherData.tempC < 15) {
            return WeatherCondition.COLD;
        }

        // Verifica se está ensolarado
        if (weatherData.isDay === 1 && weatherData.cloud < 30) {
            return WeatherCondition.SUNNY;
        }

        // Caso contrário, está nublado
        return WeatherCondition.CLOUDY;
    }
}
