import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../agent/ports/agent.repository.port';
import { PLATFORM_COMPANY_PORT } from '../platform-agent/ports/platform-company.port';
import type { PlatformCompanyPort } from '../platform-agent/ports/platform-company.port';
import { CONFIGURATOR_CODE } from './configurator-blocks';

@Injectable()
export class EnsureConfiguratorAgentService implements OnModuleInit {
  private readonly logger = new Logger(EnsureConfiguratorAgentService.name);

  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_COMPANY_PORT) private readonly platformCompany: PlatformCompanyPort,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const existing = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
      if (existing) return;
      const companyId = await this.platformCompany.getId();
      await this.agents.create({
        companyId,
        name: 'Configurador de agente',
        description: 'Ajusta o agente de WhatsApp da unidade.',
        kind: AgentKind.INTERNAL,
        platformCode: CONFIGURATOR_CODE,
        persona: {
          personaName: 'Configurador',
          systemPrompt: 'O texto de sistema é lido do arquivo a cada turno.',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Não foi possível garantir o configurador: ${message}`);
    }
  }
}
