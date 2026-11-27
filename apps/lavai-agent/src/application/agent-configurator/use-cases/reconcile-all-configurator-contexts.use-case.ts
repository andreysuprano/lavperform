import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { CONFIGURATOR_CODE } from '../configurator-blocks';
import {
  ReconcileConfiguratorContextUseCase,
  type ReconcileResult,
} from './reconcile-configurator-context.use-case';

export type ReconcileAllResult = {
  targets: number;
  changed: number;
  results: ReconcileResult[];
  failures: Array<{
    contextCompanyId: string;
    targetAgentId: string;
    error: string;
  }>;
};

@Injectable()
export class ReconcileAllConfiguratorContextsUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
    private readonly reconcileOne: ReconcileConfiguratorContextUseCase,
  ) {}

  async execute(): Promise<ReconcileAllResult> {
    const configurator = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
    if (!configurator) {
      throw new NotFoundException('O configurador não está disponível.');
    }

    const pairs = await this.conversations.listDistinctConfiguratorTargets(configurator.id);
    const results: ReconcileResult[] = [];
    const failures: ReconcileAllResult['failures'] = [];

    for (const pair of pairs) {
      try {
        const result = await this.reconcileOne.execute(pair);
        results.push(result);
      } catch (error) {
        failures.push({
          ...pair,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      targets: pairs.length,
      changed: results.filter((row) => row.contextChanged).length,
      results,
      failures,
    };
  }
}