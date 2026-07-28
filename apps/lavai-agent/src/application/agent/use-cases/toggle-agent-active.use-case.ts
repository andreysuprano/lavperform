import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentData } from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class ToggleAgentActiveUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(id: string): Promise<AgentData> {
    const agent = await this.repository.findById(id);
    if (!agent) {
      throw new NotFoundException(`Agente com id "${id}" não encontrado.`);
    }
    return this.repository.update(id, { active: !agent.active });
  }
}
