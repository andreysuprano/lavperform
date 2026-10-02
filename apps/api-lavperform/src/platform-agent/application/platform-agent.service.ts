import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LavaiAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';

export interface PlatformAgentCatalogItem {
  id: string;
  name: string;
  description: string | null;
  personaName: string | null;
  welcomeMessage: string | null;
}

@Injectable()
export class PlatformAgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lavaiAgentApi: LavaiAgentApiService,
  ) {}

  async list(): Promise<PlatformAgentCatalogItem[]> {
    const agents = await this.lavaiAgentApi.listPlatformAgents();
    return agents.filter((agent) => agent.active !== false).map(toCatalogItem);
  }

  async get(agentId: string): Promise<PlatformAgentCatalogItem> {
    const agent = await this.lavaiAgentApi.getPlatformAgent(agentId);
    if (agent.active === false || agent.kind === 'PUBLIC') {
      throw new NotFoundException('Agente não encontrado.');
    }
    return toCatalogItem(agent);
  }

  async turn(userId: string, agentId: string, companyId: string, text: string) {
    await this.ensureCompanyAccess(userId, companyId);
    const [user, company] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    ]);
    if (!user || !company) {
      throw new NotFoundException('Agente não encontrado.');
    }
    return this.lavaiAgentApi.runPlatformTurn(agentId, {
      contextCompanyId: companyId,
      platformUserId: userId,
      userName: user.name,
      companyName: company.name,
      text,
    });
  }

  async listTurns(userId: string, agentId: string, companyId: string, limit = 50) {
    await this.ensureCompanyAccess(userId, companyId);
    return this.lavaiAgentApi.listPlatformTurns(agentId, {
      contextCompanyId: companyId,
      platformUserId: userId,
      limit,
    });
  }

  private async ensureCompanyAccess(userId: string, companyId: string): Promise<void> {
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!link) {
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
    }
  }
}

function toCatalogItem(agent: {
  id: string;
  name: string;
  description: string | null;
  persona?: { personaName?: string | null; welcomeMessage?: string | null } | null;
}): PlatformAgentCatalogItem {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    personaName: agent.persona?.personaName ?? null,
    welcomeMessage: agent.persona?.welcomeMessage ?? null,
  };
}
