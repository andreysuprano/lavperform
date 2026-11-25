import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { SwlSalesService } from '../../application/swl-sales.service';
import { SwlAtendimento } from '../../api/swl.types';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface SwlSaleJobData {
  companyId: string;
  atendimento: SwlAtendimento;
  centroNome?: string;
}

@Processor(QUEUE_NAMES.SWL_SALE_PROCESS)
export class SwlSaleProcessor {
  private readonly logger = new Logger(SwlSaleProcessor.name);

  constructor(
    private readonly swlSalesService: SwlSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.SWL_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<SwlSaleJobData>) {
    const { companyId, atendimento, centroNome } = job.data;
    const lastAttempt = isSalesImportLastAttempt(job);

    try {
      const result = await this.swlSalesService.processAttendance(
        companyId,
        atendimento,
        { centroNome, lastAttempt },
      );
      if (result?.customerLinkMissing) {
        await this.notify(
          job,
          new Error(
            `Atendimento SWL ${atendimento?.id} gravado sem cliente: vínculo ausente`,
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao processar atendimento SWL da empresa ${companyId}:`,
        error instanceof Error ? error.message : error,
      );
      if (lastAttempt) {
        await this.notify(job, error);
      }
      throw error;
    }
  }

  private notify(job: Job<SwlSaleJobData>, error: unknown) {
    return this.alert.notify({
      partner: 'swl',
      companyId: job.data.companyId,
      kind: 'catchup',
      jobId: job.opts?.jobId != null ? String(job.opts.jobId) : undefined,
      attempts: job.attemptsMade + 1,
      failedAt: new Date(),
      error,
    });
  }
}
