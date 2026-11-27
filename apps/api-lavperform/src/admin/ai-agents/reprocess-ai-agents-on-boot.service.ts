import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AdminAiAgentsService } from './admin-ai-agents.service';

function truthyEnv(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

/**
 * Uma vez por release: LAVPERFORM_REPROCESS_AI_AGENTS_ON_BOOT=true na api-lavperform
 * (reconcile-all + sync ficha). Remova depois do deploy.
 */
@Injectable()
export class ReprocessAiAgentsOnBootService implements OnModuleInit {
  private readonly logger = new Logger(ReprocessAiAgentsOnBootService.name);

  constructor(private readonly reprocess: AdminAiAgentsService) {}

  onModuleInit(): void {
    if (!truthyEnv(process.env.LAVPERFORM_REPROCESS_AI_AGENTS_ON_BOOT)) return;
    void this.run();
  }

  private async run(): Promise<void> {
    try {
      const summary = await this.reprocess.reprocessAll();
      this.logger.log(
        `Boot reprocess: configurador ${summary.configurator.changed}/${summary.configurator.targets}; fichas ${summary.sheets.changed}/${summary.sheets.tried}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Boot reprocess falhou: ${message}`);
    }
  }
}