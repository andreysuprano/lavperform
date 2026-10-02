import { Inject, Injectable } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentData, AgentKind } from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class ListAgentsByCompanyUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(companyId: string): Promise<AgentData[]> {
    const agents = await this.repository.findAllByCompany(companyId);
    return agents.filter((agent) => agent.kind === AgentKind.PUBLIC);
  }
}
