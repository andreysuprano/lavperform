import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReconcileAllConfiguratorContextsUseCase } from './use-cases/reconcile-all-configurator-contexts.use-case';

function truthyEnv(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

/**
 * Uma vez por deploy: defina CONFIGURATOR_RECONCILE_ON_BOOT=true no lavai-agent
 * para reaplicar o histórico do configurador em todos os agentes públicos.
 */
@Injectable()
export class ConfiguratorReconcileOnBootService implements OnModuleInit {
  private readonly logger = new Logger(ConfiguratorReconcileOnBootService.name);

  constructor(private readonly reconcileAll: ReconcileAllConfiguratorContextsUseCase) {}

  onModuleInit(): void {
    if (!truthyEnv(process.env.CONFIGURATOR_RECONCILE_ON_BOOT)) return;
    void this.run();
  }

  private async run(): Promise<void> {
    try {
      const summary = await this.reconcileAll.execute();
      this.logger.log(
        `Reconcile em lote concluído: ${summary.targets} alvos, ${summary.changed} contextos alterados, ${summary.failures.length} falhas`,
      );
      if (summary.failures.length > 0) {
        for (const failure of summary.failures) {
          this.logger.warn(
            `Reconcile falhou (${failure.contextCompanyId}/${failure.targetAgentId}): ${failure.error}`,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Reconcile em lote no boot falhou: ${message}`);
    }
  }
}