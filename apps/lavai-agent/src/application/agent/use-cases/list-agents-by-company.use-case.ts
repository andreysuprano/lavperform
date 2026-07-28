import { Inject, Injectable } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentData } from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class ListAgentsByCompanyUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(companyId: string): Promise<AgentData[]> {
    return this.repository.findAllByCompany(companyId);
  }
}
