import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class DeleteAgentUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Agente com id "${id}" não encontrado.`);
    }
    await this.repository.delete(id);
  }
}
