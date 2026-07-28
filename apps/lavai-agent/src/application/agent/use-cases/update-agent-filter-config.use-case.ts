import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentFilterConfigData,
  UpdateAgentFilterConfigInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class UpdateAgentFilterConfigUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(
    agentId: string,
    input: UpdateAgentFilterConfigInput,
  ): Promise<AgentFilterConfigData> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente com id "${agentId}" não encontrado.`);
    }
    return this.repository.updateFilterConfig(agentId, input);
  }
}
