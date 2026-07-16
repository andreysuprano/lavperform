import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { RfvEngineService } from '../../application/rfv-engine.service';

@Processor(QUEUE_NAMES.RFV_AUTO_CONFIGURATION)
export class RfvAutoConfigurationProcessor {
    private readonly logger = new Logger(RfvAutoConfigurationProcessor.name);

    constructor(private readonly rfvEngineService: RfvEngineService) {}

    @Process({ name: 'auto-configure', concurrency: 5 })
    async handleAutoConfiguration(job: Job) {
        const { companyId } = job.data;

        this.logger.log(`Processando configuração automática RFV para empresa: ${companyId}`);

        try {
            await this.rfvEngineService.generateAutomaticConfiguration(companyId);
            this.logger.log(`Configuração automática RFV concluída para empresa: ${companyId}`);
        } catch (error) {
            this.logger.error(
                `Erro ao gerar configuração automática RFV para empresa ${companyId}:`,
                error,
            );
            throw error;
        }
    }
}
