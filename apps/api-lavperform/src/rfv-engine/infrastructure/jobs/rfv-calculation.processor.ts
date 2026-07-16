import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { RfvEngineService } from '../../application/rfv-engine.service';

@Processor(QUEUE_NAMES.RFV_CALCULATION)
export class RfvCalculationProcessor {
    private readonly logger = new Logger(RfvCalculationProcessor.name);

    constructor(private readonly rfvEngineService: RfvEngineService) {}

    @Process({ name: 'calculate', concurrency: 100 })
    async handleCalculation(job: Job) {
        const { customerId } = job.data;

        this.logger.log(`Processando cálculo RFV para cliente: ${customerId}`);

        try {
            await this.rfvEngineService.executeCalculationForCustomer(customerId);
            this.logger.log(`Cálculo RFV concluído para cliente: ${customerId}`);
        } catch (error) {
            this.logger.error(`Erro ao processar cálculo RFV para cliente ${customerId}:`, error);
            throw error;
        }
    }
}
