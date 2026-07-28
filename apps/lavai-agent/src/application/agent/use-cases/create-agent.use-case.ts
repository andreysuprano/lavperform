import { Inject, Injectable } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentWithConfigsData,
  CreateAgentInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

@Injectable()
export class CreateAgentUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(input: CreateAgentInput): Promise<AgentWithConfigsData> {
    return this.repository.create(input);
  }
}
