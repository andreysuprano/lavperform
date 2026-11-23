import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AiAgentService } from '../application/ai-agent.service';

export const COMPANY_ID_HEADER = 'x-company-id';

/**
 * Em toda rota com :agentId, confere se o agente é da empresa selecionada.
 * A empresa vem do :companyId da URL ou, nas rotas sem ele, do header
 * X-Company-Id que o app envia com a empresa selecionada.
 */
@Injectable()
export class AgentCompanyGuard implements CanActivate {
  constructor(private readonly aiAgentService: AiAgentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const agentId = firstValue(request.params?.agentId);
    if (!agentId) return true;

    const companyId =
      firstValue(request.params?.companyId) ??
      firstValue(request.headers?.[COMPANY_ID_HEADER]);
    if (!companyId) return true;

    await this.aiAgentService.assertAgentBelongsToCompany(companyId, agentId);
    return true;
  }
}

function firstValue(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}
