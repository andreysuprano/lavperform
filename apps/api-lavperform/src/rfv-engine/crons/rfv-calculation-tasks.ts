import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RfvEngineService } from '../application/rfv-engine.service';
import { IRfvConfigurationRepository } from '../domain/rfv-configuration.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RfvCalculationTasks {
    private readonly logger = new Logger(RfvCalculationTasks.name);

    constructor(
        private readonly rfvEngineService: RfvEngineService,
        @Inject('IRfvConfigurationRepository')
        private readonly rfvConfigurationRepository: IRfvConfigurationRepository,
        private readonly prisma: PrismaService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleNightlyRfvReclassification() {
        this.logger.log('Iniciando reclassificação RFV noturna (todas as empresas)');

        try {
            const companies = await this.prisma.company.findMany({
                select: { id: true },
            });

            this.logger.log(`Total de empresas para reclassificar: ${companies.length}`);

            for (const company of companies) {
                try {
                    await this.rfvEngineService.calculateForCompany(company.id);
                    this.logger.log(`Reclassificação RFV enfileirada para empresa: ${company.id}`);
                } catch (error) {
                    this.logger.error(`Erro ao enfileirar reclassificação RFV para empresa ${company.id}:`, error);
                }
            }

            this.logger.log('Reclassificação RFV noturna concluída');
        } catch (error) {
            this.logger.error('Erro ao processar reclassificação RFV noturna:', error);
        }
    }

    @Cron(CronExpression.EVERY_WEEK)
    async handleWeeklyRfvCalculation() {
        this.logger.log('Iniciando cálculo RFV automático semanal');

        try {
            const configurations = await this.rfvConfigurationRepository.findAllActiveForRecalculation();

            const weeklyConfigs = configurations.filter((config) => config.recalculateFrequency === 'weekly');

            this.logger.log(`Total de empresas com recálculo semanal ativo: ${weeklyConfigs.length}`);

            for (const config of weeklyConfigs) {
                try {
                    await this.rfvEngineService.calculateForCompany(config.companyId);
                    this.logger.log(`Cálculo RFV enfileirado para empresa: ${config.companyId}`);
                } catch (error) {
                    this.logger.error(`Erro ao enfileirar cálculo RFV para empresa ${config.companyId}:`, error);
                }
            }

            this.logger.log('Cálculo RFV automático semanal concluído');
        } catch (error) {
            this.logger.error('Erro ao processar cálculo RFV automático semanal:', error);
        }
    }

    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async handleMonthlyRfvCalculation() {
        this.logger.log('Iniciando cálculo RFV automático mensal');

        try {
            const configurations = await this.rfvConfigurationRepository.findAllActiveForRecalculation();

            const monthlyConfigs = configurations.filter((config) => config.recalculateFrequency === 'monthly');

            this.logger.log(`Total de empresas com recálculo mensal ativo: ${monthlyConfigs.length}`);

            for (const config of monthlyConfigs) {
                try {
                    await this.rfvEngineService.calculateForCompany(config.companyId);
                    this.logger.log(`Cálculo RFV enfileirado para empresa: ${config.companyId}`);
                } catch (error) {
                    this.logger.error(`Erro ao enfileirar cálculo RFV para empresa ${config.companyId}:`, error);
                }
            }

            this.logger.log('Cálculo RFV automático mensal concluído');
        } catch (error) {
            this.logger.error('Erro ao processar cálculo RFV automático mensal:', error);
        }
    }
}
