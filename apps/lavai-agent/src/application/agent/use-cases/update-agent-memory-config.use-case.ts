import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentMemoryConfigData,
  UpdateAgentMemoryConfigInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class UpdateAgentMemoryConfigUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(agentId: string, input: UpdateAgentMemoryConfigInput): Promise<AgentMemoryConfigData> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente com id "${agentId}" não encontrado.`);
    }
    return this.repository.updateMemoryConfig(agentId, input);
  }
}
