import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { IRfvSegmentRepository } from '../domain/rfv-segment.repository.interface';
import { IRfvConfigurationRepository } from '../domain/rfv-configuration.repository.interface';
import { ICustomerRepository } from '../../customers/domain/customer.repository.interface';
import { RfvCalculatorService } from './rfv-calculator.service';
import { RfvScore } from '../domain/rfv-score.entity';
import { UpdateRfvConfigurationDto } from './dto/update-rfv-configuration.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { nowUTC } from '../../common/utils/date.utils';
import {
    calibrateRfvThresholds,
    CustomerRfvMetrics,
} from './rfv-auto-calibration.util';

@Injectable()
export class RfvEngineService {
    private readonly logger = new Logger(RfvEngineService.name);

    constructor(
        @Inject('IRfvSegmentRepository')
        private readonly rfvSegmentRepository: IRfvSegmentRepository,
        @Inject('IRfvConfigurationRepository')
        private readonly rfvConfigurationRepository: IRfvConfigurationRepository,
        @Inject('ICustomerRepository')
        private readonly customerRepository: ICustomerRepository,
        private readonly prisma: PrismaService,
        private readonly rfvCalculatorService: RfvCalculatorService,
        @InjectQueue(QUEUE_NAMES.RFV_CALCULATION) private readonly rfvCalculationQueue: Queue,
        @InjectQueue(QUEUE_NAMES.BATCH_RFV_CALCULATION) private readonly batchRfvCalculationQueue: Queue,
        @InjectQueue(QUEUE_NAMES.RFV_AUTO_CONFIGURATION) private readonly autoConfigurationQueue: Queue,
    ) {}

    async calculateForCustomer(customerId: string): Promise<void> {
        await this.rfvCalculationQueue.add('calculate', { customerId });
    }

    async calculateForCompany(companyId: string, customerIds?: string[]): Promise<void> {
        await this.batchRfvCalculationQueue.add('batch-calculate', {
            companyId,
            customerIds,
        });
    }

    async queueAutomaticConfiguration(companyId: string): Promise<void> {
        await this.autoConfigurationQueue.add('auto-configure', { companyId });
    }

    /**
     * Analisa a base de clientes da empresa (recência, frequência e ticket médio),
     * calibra os thresholds RFV a partir da distribuição real dos dados, persiste a
     * configuração e reenfileira todos os customers para reclassificação.
     */
    async generateAutomaticConfiguration(companyId: string): Promise<void> {
        this.logger.log(`Iniciando configuração automática RFV para empresa ${companyId}`);

        const config = await this.getOrCreateConfiguration(companyId);

        const analysisEndDate = nowUTC();
        const windowDays = Math.max(
            config.recencyPeriodDays,
            config.frequencyPeriodDays,
            config.monetaryPeriodDays,
        );
        const analysisStartDate = new Date(analysisEndDate);
        analysisStartDate.setDate(analysisStartDate.getDate() - windowDays);

        const grouped = await this.prisma.order.groupBy({
            by: ['customerId'],
            where: {
                companyId,
                createdAt: {
                    gte: analysisStartDate,
                    lte: analysisEndDate,
                },
            },
            _count: { _all: true },
            _sum: { total: true },
            _max: { createdAt: true },
        });

        const metrics: CustomerRfvMetrics[] = grouped.map((group) => {
            const totalOrders = group._count._all;
            const totalSpent = Number(group._sum.total ?? 0);
            const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;

            const lastOrderDate = group._max.createdAt
                ? new Date(group._max.createdAt)
                : analysisEndDate;
            const daysSinceLastOrder = Math.floor(
                (analysisEndDate.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            return { daysSinceLastOrder, totalOrders, averageTicket };
        });

        const thresholds = calibrateRfvThresholds(metrics);

        await this.rfvConfigurationRepository.update(config.id, {
            recencyThresholds: thresholds.recencyThresholds,
            frequencyThresholds: thresholds.frequencyThresholds,
            monetaryThresholds: thresholds.monetaryThresholds,
        });

        this.logger.log(
            `Configuração RFV auto-gerada para empresa ${companyId} ` +
            `com base em ${metrics.length} clientes: ${JSON.stringify(thresholds)}`,
        );

        // Reenfileira todos os customers para revalidação com a nova configuração.
        await this.calculateForCompany(companyId);
    }

    async executeCalculationForCustomer(customerId: string): Promise<void> {
        try {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                this.logger.warn(`Cliente ${customerId} não encontrado`);
                return;
            }

            const config = await this.getOrCreateConfiguration(customer.companyId);

            const analysisEndDate = nowUTC();
            const analysisStartDate = new Date(analysisEndDate);
            analysisStartDate.setDate(analysisStartDate.getDate() - Math.max(
                config.recencyPeriodDays,
                config.frequencyPeriodDays,
                config.monetaryPeriodDays,
            ));

            // Busca TODOS os pedidos do período sem paginação
            const ordersList = await this.prisma.order.findMany({
                where: {
                    customerId,
                    createdAt: {
                        gte: analysisStartDate,
                        lte: analysisEndDate,
                    },
                },
                select: {
                    id: true,
                    total: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            // Se não há pedidos no período de análise, busca o histórico completo
            // para classificar corretamente (perdido, hibernando, etc.) em vez de deixar como "novo"
            let allTimeOrdersList = ordersList;
            if (ordersList.length === 0) {
                allTimeOrdersList = await this.prisma.order.findMany({
                    where: { customerId },
                    select: { id: true, total: true, createdAt: true },
                    orderBy: { createdAt: 'desc' },
                });

                if (allTimeOrdersList.length === 0) {
                    this.logger.debug(`Cliente ${customerId} nunca realizou pedidos`);
                    return;
                }

                this.logger.debug(
                    `Cliente ${customerId} sem pedidos nos últimos ${Math.max(config.recencyPeriodDays, config.frequencyPeriodDays, config.monetaryPeriodDays)} dias. ` +
                    `Usando ${allTimeOrdersList.length} pedidos do histórico completo para classificação.`,
                );
            }

            const totalOrders = allTimeOrdersList.length;
            const totalSpent = allTimeOrdersList.reduce((sum: number, order) => {
                return sum + Number(order.total);
            }, 0);
            const averageTicket = totalSpent / totalOrders;

            const lastOrder = allTimeOrdersList[0]; // já ordenado por createdAt desc

            // Calcula dias desde última compra garantindo cálculo correto em UTC
            // lastOrder.createdAt é Date do Prisma (já em UTC após configuração)
            const lastOrderDate = lastOrder.createdAt instanceof Date 
                ? lastOrder.createdAt 
                : new Date(lastOrder.createdAt);
            
            const daysSinceLastOrder = Math.floor(
                (analysisEndDate.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            this.logger.debug(
                `Cliente ${customerId}: Última compra em ${lastOrderDate.toISOString()}, ` +
                `há ${daysSinceLastOrder} dias. Análise: ${analysisEndDate.toISOString()}`
            );

            const recencyScore = this.rfvCalculatorService.calculateRecencyScore(
                daysSinceLastOrder,
                config.recencyThresholds,
            );

            const frequencyScore = this.rfvCalculatorService.calculateFrequencyScore(
                totalOrders,
                config.frequencyThresholds,
            );

            const monetaryScore = this.rfvCalculatorService.calculateMonetaryScore(
                averageTicket,
                config.monetaryThresholds,
            );

            const rfvScore = new RfvScore({
                recencyScore,
                frequencyScore,
                monetaryScore,
                segment: '',
                daysSinceLastOrder,
                totalOrders,
                totalSpent,
                averageTicket,
            });

            const segment = this.rfvCalculatorService.determineSegment(rfvScore);

            await this.rfvSegmentRepository.create({
                customerId,
                recencyScore,
                frequencyScore,
                monetaryScore,
                rfvSegment: segment,
                daysSinceLastOrder,
                totalOrders,
                totalSpent,
                averageTicket,
                analysisStartDate,
                analysisEndDate,
            });

            await this.customerRepository.update(customerId, {
                rfvClassification: segment,
            });

            this.logger.log(`RFV calculado para cliente ${customerId}: ${segment}`);
        } catch (error) {
            this.logger.error(`Erro ao calcular RFV para cliente ${customerId}:`, error);
            throw error;
        }
    }

    async getConfiguration(companyId: string) {
        return await this.rfvConfigurationRepository.findByCompanyId(companyId);
    }

    async updateConfiguration(companyId: string, dto: UpdateRfvConfigurationDto) {
        const config = await this.rfvConfigurationRepository.findByCompanyId(companyId);
        
        if (!config) {
            throw new NotFoundException('Configuração RFV não encontrada para esta empresa');
        }

        return await this.rfvConfigurationRepository.update(config.id, dto);
    }

    async getCustomerRfvHistory(customerId: string) {
        return await this.rfvSegmentRepository.findByCustomerId(customerId);
    }

    async getCustomerLatestRfv(customerId: string) {
        return await this.rfvSegmentRepository.findLatestByCustomerId(customerId);
    }

    async getSegmentStatistics(companyId: string) {
        return await this.rfvSegmentRepository.countBySegment(companyId);
    }

    async getOrCreateConfiguration(companyId: string) {
        let config = await this.rfvConfigurationRepository.findByCompanyId(companyId);

        if (!config) {
            config = await this.createDefaultConfiguration(companyId);
        }

        return config;
    }

    async createDefaultConfiguration(companyId: string) {
        return await this.rfvConfigurationRepository.create({
            companyId,
            recencyPeriodDays: 180,
            frequencyPeriodDays: 180,
            monetaryPeriodDays: 180,
            recencyThresholds: [14, 30, 60, 90],
            frequencyThresholds: [4, 8, 15, 25],
            monetaryThresholds: [30, 50, 70, 100],
            autoRecalculate: true,
            recalculateFrequency: 'daily',
        });
    }
}
