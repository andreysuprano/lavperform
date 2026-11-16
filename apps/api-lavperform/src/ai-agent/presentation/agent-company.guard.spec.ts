import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { AgentCompanyGuard } from './agent-company.guard';
import { AiAgentService } from '../application/ai-agent.service';

function contextFor(request: {
  params?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params: {}, headers: {}, ...request }),
    }),
  } as unknown as ExecutionContext;
}

describe('AgentCompanyGuard', () => {
  let assertAgentBelongsToCompany: jest.Mock;
  let guard: AgentCompanyGuard;

  beforeEach(() => {
    assertAgentBelongsToCompany = jest.fn().mockResolvedValue(undefined);
    guard = new AgentCompanyGuard({
      assertAgentBelongsToCompany,
    } as unknown as AiAgentService);
  });

  it('confere a empresa da URL quando a rota tem companyId e agentId', async () => {
    await expect(
      guard.canActivate(
        contextFor({ params: { companyId: 'empresa-a', agentId: 'agente-1' } }),
      ),
    ).resolves.toBe(true);

    expect(assertAgentBelongsToCompany).toHaveBeenCalledWith('empresa-a', 'agente-1');
  });

  it('usa o header X-Company-Id quando a rota não tem companyId', async () => {
    await guard.canActivate(
      contextFor({
        params: { agentId: 'agente-1' },
        headers: { 'x-company-id': 'empresa-b' },
      }),
    );

    expect(assertAgentBelongsToCompany).toHaveBeenCalledWith('empresa-b', 'agente-1');
  });

  it('prefere a empresa da URL ao header', async () => {
    await guard.canActivate(
      contextFor({
        params: { companyId: 'empresa-a', agentId: 'agente-1' },
        headers: { 'x-company-id': 'empresa-b' },
      }),
    );

    expect(assertAgentBelongsToCompany).toHaveBeenCalledWith('empresa-a', 'agente-1');
  });

  it('bloqueia quando o agente é de outra empresa', async () => {
    assertAgentBelongsToCompany.mockRejectedValue(
      new NotFoundException('Agente não pertence a esta empresa'),
    );

    await expect(
      guard.canActivate(
        contextFor({ params: { companyId: 'borbulha', agentId: 'agente-cabistani' } }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('libera rotas sem agentId', async () => {
    await expect(
      guard.canActivate(contextFor({ params: { companyId: 'empresa-a' } })),
    ).resolves.toBe(true);

    expect(assertAgentBelongsToCompany).not.toHaveBeenCalled();
  });

  it('libera quando não há empresa na URL nem no header', async () => {
    await expect(
      guard.canActivate(contextFor({ params: { agentId: 'agente-1' } })),
    ).resolves.toBe(true);

    expect(assertAgentBelongsToCompany).not.toHaveBeenCalled();
  });
});
