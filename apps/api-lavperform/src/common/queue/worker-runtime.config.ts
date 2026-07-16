/**
 * Controla se o processo atual deve executar workers Bull, crons e listeners
 * de domínio. A API Admin (`main-admin.ts`) e a Public API (`main-public-api.ts`)
 * definem APP_RUNTIME e atuam apenas como produtores de jobs — o processamento
 * fica na API principal.
 */
const NON_WORKER_RUNTIMES = new Set(['admin', 'public-api']);

export function isWorkerRuntime(): boolean {
  const runtime = process.env.APP_RUNTIME;
  return !runtime || !NON_WORKER_RUNTIMES.has(runtime);
}

export function workerProviders<T extends unknown[]>(...providers: T): T {
  return (isWorkerRuntime() ? providers : []) as T;
}
