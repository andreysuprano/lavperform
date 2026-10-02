import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
  isDuplicateJobError,
} from 'src/integrations/sales-import/sales-import-queue';

describe('sales-import-queue', () => {
  it('reconhece a mensagem antiga Job already exists', () => {
    expect(isDuplicateJobError(new Error('Job already exists'))).toBe(true);
    expect(isDuplicateJobError(new Error('redis down'))).toBe(false);
  });

  it('remove job ao completar ou falhar', () => {
    expect(buildSalesImportJobOptions('vmlav-import:c:2026-10-01:2330')).toEqual({
      jobId: 'vmlav-import:c:2026-10-01:2330',
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('enqueue retorna skipped quando add devolve o jobId existente como string', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue('x'),
    };

    await expect(
      enqueueSalesImportJob(queue as any, 'vmlav-sales-import', {}, { jobId: 'x' }),
    ).resolves.toBe('skipped');
  });

  it('enqueue retorna queued quando o job persistido tem o mesmo timestamp', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'x', timestamp: 2_000 }),
      getJob: jest.fn().mockResolvedValue({ id: 'x', timestamp: 2_000 }),
    };

    await expect(
      enqueueSalesImportJob(queue as any, 'vmlav-sales-import', {}, { jobId: 'x' }),
    ).resolves.toBe('queued');
    expect(queue.getJob).toHaveBeenCalledWith('x');
  });

  it('enqueue retorna skipped quando o job persistido é mais antigo', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'x', timestamp: 2_000 }),
      getJob: jest.fn().mockResolvedValue({ id: 'x', timestamp: 1_000 }),
    };

    await expect(
      enqueueSalesImportJob(queue as any, 'vmlav-sales-import', {}, { jobId: 'x' }),
    ).resolves.toBe('skipped');
  });

  it('enqueue propaga erro de redis', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('redis down')),
    };

    await expect(
      enqueueSalesImportJob(queue as any, 'vmlav-sales-import', {}, { jobId: 'x' }),
    ).rejects.toThrow('redis down');
  });
});
