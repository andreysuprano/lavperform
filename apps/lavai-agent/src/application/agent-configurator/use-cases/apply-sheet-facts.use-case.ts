import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { persistSheetFacts, type SheetFactsInput } from '../sheet-facts';

@Injectable()
export class ApplySheetFactsUseCase {
  constructor(@Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort) {}

  async execute(agentId: string, sheet: SheetFactsInput): Promise<{ changed: boolean }> {
    const agent = await this.agents.findById(agentId);
    if (!agent?.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }
    const applied = await persistSheetFacts(this.agents, agent, sheet);
    return { changed: applied.changed };
  }
}
