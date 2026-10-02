import { JobOptions, Queue } from 'bull';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
  isDuplicateJobError,
} from 'src/integrations/sales-import/sales-import-queue';

export function vmlavImportJobId(companyId: string, date: string): string {
  return `vmlav-import:${companyId}:${date}`;
}

export function vmlavSaleJobId(companyId: string, idVenda: number): string {
  return `vmlav-sale:${companyId}:${idVenda}`;
}

export function buildVmLavImportJobOptions(jobId: string): JobOptions {
  return buildSalesImportJobOptions(jobId);
}

export function buildVmLavSaleJobOptions(jobId: string): JobOptions {
  return {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: true,
  };
}

export function isVmLavDuplicateJobError(error: unknown): boolean {
  return isDuplicateJobError(error);
}

export async function enqueueVmLavJob(
  queue: Queue,
  name: string,
  data: unknown,
  options: JobOptions,
): Promise<'queued' | 'skipped'> {
  return enqueueSalesImportJob(queue, name, data, options);
}
