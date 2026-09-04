import {
  buildVmLavImportJobOptions,
  buildVmLavSaleJobOptions,
  enqueueVmLavJob,
  isVmLavDuplicateJobError,
} from 'src/integrations/vmlav/vmlav-queue.util';

describe('vmlav-queue.util', () => {
  it('detecta colisão Job already exists', () => {
    expect(isVmLavDuplicateJobError(new Error('Job already exists'))).toBe(true);
    expect(isVmLavDuplicateJobError(new Error('other'))).toBe(false);
  });

  it('inclui removeOnComplete e removeOnFail nos jobs de import', () => {
    expect(buildVmLavImportJobOptions('vmlav-import:c:2026-09-01')).toEqual({
      jobId: 'vmlav-import:c:2026-09-01',
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('inclui removeOnComplete e removeOnFail nos jobs de venda', () => {
    expect(buildVmLavSaleJobOptions('vmlav-sale:c:1')).toEqual({
      jobId: 'vmlav-sale:c:1',
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: true,
    });
  });

  it('enqueueVmLavJob retorna skipped em colisão ativa', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('Job already exists')),
    };

    await expect(
      enqueueVmLavJob(queue as any, 'job-name', {}, { jobId: 'x' }),
    ).resolves.toBe('skipped');
  });

  it('enqueueVmLavJob propaga outros erros', async () => {
    const queue = {
      add: jest.fn().mockRejectedValue(new Error('redis down')),
    };

    await expect(
      enqueueVmLavJob(queue as any, 'job-name', {}, { jobId: 'x' }),
    ).rejects.toThrow('redis down');
  });
});
