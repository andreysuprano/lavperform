import { Inject, Injectable } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentKind,
  AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';

@Injectable()
export class ListPlatformAgentsUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
  ) {}

  execute(): Promise<AgentWithConfigsData[]> {
    return this.agents.findAllByKind(AgentKind.INTERNAL);
  }
}
