import { JobOptions, Queue } from 'bull';

export function vmlavImportJobId(companyId: string, date: string): string {
  return `vmlav-import:${companyId}:${date}`;
}

export function vmlavSaleJobId(companyId: string, idVenda: number): string {
  return `vmlav-sale:${companyId}:${idVenda}`;
}

export function buildVmLavImportJobOptions(jobId: string): JobOptions {
  return {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
  };
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
  const message =
    error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Job already exists');
}

export async function enqueueVmLavJob(
  queue: Queue,
  name: string,
  data: unknown,
  options: JobOptions,
): Promise<'queued' | 'skipped'> {
  try {
    await queue.add(name, data, options);
    return 'queued';
  } catch (error) {
    if (isVmLavDuplicateJobError(error)) {
      return 'skipped';
    }
    throw error;
  }
}
