import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { RfvEngineService } from '../../application/rfv-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor(QUEUE_NAMES.BATCH_RFV_CALCULATION)
export class BatchRfvCalculationProcessor {
    private readonly logger = new Logger(BatchRfvCalculationProcessor.name);

    constructor(
        private readonly rfvEngineService: RfvEngineService,
        private readonly prisma: PrismaService,
    ) {}

    @Process({ name: 'batch-calculate', concurrency: 50 })
    async handleBatchCalculation(job: Job) {
        const { companyId, customerIds } = job.data;

        this.logger.log(`Processando cálculo RFV em lote para empresa: ${companyId}`);

        try {
            let customers: Array<{ id: string }>;

            if (customerIds && customerIds.length > 0) {
                customers = customerIds.map((id: string) => ({ id }));
            } else {
                customers = await this.prisma.customer.findMany({
                    where: { companyId },
                    select: { id: true },
                });
            }

            this.logger.log(`Total de clientes para processar: ${customers.length}`);

            const chunkSize = 50;
            for (let i = 0; i < customers.length; i += chunkSize) {
                const chunk = customers.slice(i, i + chunkSize);

                await Promise.all(
                    chunk.map(async (customer) => {
                        try {
                            await this.rfvEngineService.executeCalculationForCustomer(customer.id);
                        } catch (error) {
                            this.logger.error(`Erro ao calcular RFV para cliente ${customer.id}:`, error);
                        }
                    }),
                );

                this.logger.log(`Processado chunk ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(customers.length / chunkSize)}`);
            }

            this.logger.log(`Cálculo RFV em lote concluído para empresa: ${companyId}. Total: ${customers.length} clientes`);
        } catch (error) {
            this.logger.error(`Erro ao processar cálculo RFV em lote para empresa ${companyId}:`, error);
            throw error;
        }
    }
}
