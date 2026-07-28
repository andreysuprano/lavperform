import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentMediaConfigData,
  UpdateAgentMediaConfigInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class UpdateAgentMediaConfigUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(agentId: string, input: UpdateAgentMediaConfigInput): Promise<AgentMediaConfigData> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente com id "${agentId}" não encontrado.`);
    }
    return this.repository.updateMediaConfig(agentId, input);
  }
}
