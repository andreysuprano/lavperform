import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentKind,
  AgentWithConfigsData,
  CreateAgentInput,
} from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_COMPANY_PORT } from '../ports/platform-company.port';
import type { PlatformCompanyPort } from '../ports/platform-company.port';

export type CreatePlatformAgentInput = Omit<CreateAgentInput, 'companyId' | 'kind'>;

@Injectable()
export class CreatePlatformAgentUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_COMPANY_PORT)
    private readonly platformCompany: PlatformCompanyPort,
  ) {}

  async execute(input: CreatePlatformAgentInput): Promise<AgentWithConfigsData> {
    if (input.instanceName) {
      throw new BadRequestException('Agente de plataforma não aceita instanceName');
    }

    const companyId = await this.platformCompany.getId();
    return this.agents.create({
      ...input,
      companyId,
      kind: AgentKind.INTERNAL,
      instanceName: undefined,
    });
  }
}
