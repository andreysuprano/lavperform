import { JobOptions, Queue } from 'bull';

export function isDuplicateJobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message.includes('Job already exists');
}

export function buildSalesImportJobOptions(jobId: string): JobOptions {
  return {
    jobId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true,
  };
}

export async function enqueueSalesImportJob(
  queue: Queue,
  name: string,
  data: unknown,
  options: JobOptions,
): Promise<'queued' | 'skipped'> {
  try {
    await queue.add(name, data, options);
    return 'queued';
  } catch (error) {
    if (isDuplicateJobError(error)) {
      return 'skipped';
    }
    throw error;
  }
}
