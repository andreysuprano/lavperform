import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentJourneyConfigData,
  UpdateAgentJourneyConfigInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class UpdateAgentJourneyConfigUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(
    agentId: string,
    input: UpdateAgentJourneyConfigInput,
  ): Promise<AgentJourneyConfigData> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente ${agentId} não encontrado.`);
    }
    return this.repository.updateJourneyConfig(agentId, input);
  }
}
