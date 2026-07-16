import {
  isWorkerRuntime,
  workerProviders,
} from 'src/common/queue/worker-runtime.config';

describe('worker-runtime.config', () => {
  const originalRuntime = process.env.APP_RUNTIME;

  afterEach(() => {
    if (originalRuntime === undefined) {
      delete process.env.APP_RUNTIME;
    } else {
      process.env.APP_RUNTIME = originalRuntime;
    }
  });

  it('habilita workers por padrão', () => {
    delete process.env.APP_RUNTIME;
    expect(isWorkerRuntime()).toBe(true);
    expect(workerProviders('A', 'B')).toEqual(['A', 'B']);
  });

  it('desabilita workers no runtime admin', () => {
    process.env.APP_RUNTIME = 'admin';
    expect(isWorkerRuntime()).toBe(false);
    expect(workerProviders('A', 'B')).toEqual([]);
  });

  it('desabilita workers no runtime public-api', () => {
    process.env.APP_RUNTIME = 'public-api';
    expect(isWorkerRuntime()).toBe(false);
    expect(workerProviders('A', 'B')).toEqual([]);
  });
});
