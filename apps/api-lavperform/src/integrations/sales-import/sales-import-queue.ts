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

type CreatedJob = {
  id?: string | number;
  timestamp?: number;
};

/**
 * Bull 4 não lança "Job already exists". addJob-6.lua devolve o jobId
 * existente como string. Queue.add embrulha esse retorno num Job em memória
 * com timestamp novo; o hash no Redis conserva o timestamp original.
 */
async function bullAddIsDuplicate(
  queue: Queue,
  jobId: JobOptions['jobId'],
  added: unknown,
): Promise<boolean> {
  if (jobId == null || jobId === '') {
    return false;
  }

  const requestedId = String(jobId);
  if (typeof added === 'string') {
    return added === requestedId;
  }

  if (typeof added !== 'object' || added === null) {
    return false;
  }

  const created = added as CreatedJob;
  if (created.id == null || String(created.id) !== requestedId) {
    return false;
  }
  if (typeof queue.getJob !== 'function') {
    return false;
  }

  const stored = await queue.getJob(jobId);
  if (stored?.timestamp == null || created.timestamp == null) {
    return false;
  }

  return Number(stored.timestamp) !== Number(created.timestamp);
}

export async function enqueueSalesImportJob(
  queue: Queue,
  name: string,
  data: unknown,
  options: JobOptions,
): Promise<'queued' | 'skipped'> {
  const added = await queue.add(name, data, options);
  if (await bullAddIsDuplicate(queue, options.jobId, added)) {
    return 'skipped';
  }
  return 'queued';
}
