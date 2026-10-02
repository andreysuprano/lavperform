import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
  isDuplicateJobError,
} from 'src/integrations/sales-import/sales-import-queue';

describe('sales-import-queue', () => {
  it('detecta Job already exists', () => {
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

  it('enqueue retorna skipped na colisão', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('Job already exists')),
    };
    await expect(
      enqueueSalesImportJob(queue as any, 'vmlav-sales-import', {}, { jobId: 'x' }),
    ).resolves.toBe('skipped');
  });
});
