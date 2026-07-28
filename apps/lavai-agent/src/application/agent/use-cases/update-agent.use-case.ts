import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentData,
  UpdateAgentInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class UpdateAgentUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateAgentInput): Promise<AgentData> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Agente com id "${id}" não encontrado.`);
    }
    return this.repository.update(id, input);
  }
}
