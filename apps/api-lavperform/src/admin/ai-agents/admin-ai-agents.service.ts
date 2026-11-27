import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OverAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';
import { PromptSheetService } from '../../ai-agent/application/prompt-sheet.service';

export type AdminReprocessAllAiAgentsResult = {
  configurator: Awaited<ReturnType<OverAgentApiService['reconcileAllConfiguratorContexts']>>;
  sheets: {
    agentsActive: number;
    tried: number;
    changed: number;
    failures: Array<{ agentId: string; companyId: string; error: string }>;
  };
};

/**
 * Reprocessa todas as IAs sem ir lavanderia por lavanderia:
 * 1) histórico do configurador (reconcile-all no LavAI)
 * 2) fatos da ficha de cada agente ativo
 */
@Injectable()
export class AdminAiAgentsService {
  private readonly logger = new Logger(AdminAiAgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lavai: OverAgentApiService,
    private readonly promptSheet: PromptSheetService,
  ) {}

  async reprocessAll(): Promise<AdminReprocessAllAiAgentsResult> {
    this.logger.log('Iniciando reprocessamento em lote das IAs (configurador + ficha).');
    const configurator = await this.lavai.reconcileAllConfiguratorContexts();

    const agents = await this.prisma.aiAgent.findMany({
      where: { active: true },
      select: { id: true, companyId: true },
    });

    const failures: AdminReprocessAllAiAgentsResult['sheets']['failures'] = [];
    let tried = 0;
    let changed = 0;

    for (const agent of agents) {
      try {
        const sheet = await this.promptSheet.get(agent.companyId, agent.id);
        const hasAnswers = Object.values(sheet.answers).some((value) => value?.trim() !== '');
        if (!hasAnswers) continue;
        tried += 1;
        const result = await this.lavai.applySheetFacts(agent.id, {
          serviceModel: sheet.serviceModel,
          answers: sheet.answers,
        });
        if (result.changed) changed += 1;
      } catch (error) {
        failures.push({
          agentId: agent.id,
          companyId: agent.companyId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log(
      `Reprocessamento concluído — configurador: ${configurator.changed}/${configurator.targets} alterados; ficha: ${changed}/${tried}; falhas ficha: ${failures.length}`,
    );

    return {
      configurator,
      sheets: { agentsActive: agents.length, tried, changed, failures },
    };
  }
}