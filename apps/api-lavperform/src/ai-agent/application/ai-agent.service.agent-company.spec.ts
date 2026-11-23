import { NotFoundException } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LavaiAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';
import type { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import type { ConfigService } from '@nestjs/config';
import type { PromptSheetService } from './prompt-sheet.service';

describe('AiAgentService.assertAgentBelongsToCompany', () => {
  let findUnique: jest.Mock;
  let getAgent: jest.Mock;
  let service: AiAgentService;

  beforeEach(() => {
    findUnique = jest.fn().mockResolvedValue({ overAgentCompanyId: 'lavai-cabistani' });
    getAgent = jest.fn().mockResolvedValue({ id: 'agente-1', companyId: 'lavai-cabistani' });
    service = new AiAgentService(
      { company: { findUnique } } as unknown as PrismaService,
      { getAgent } as unknown as LavaiAgentApiService,
      {} as UazapiClient,
      { get: jest.fn() } as unknown as ConfigService,
      {} as PromptSheetService,
    );
  });

  it('passa quando o agente é da empresa', async () => {
    await expect(
      service.assertAgentBelongsToCompany('cabistani', 'agente-1'),
    ).resolves.toBeUndefined();

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cabistani' } }),
    );
    expect(getAgent).toHaveBeenCalledWith('agente-1');
  });

  it('recusa quando o agente é de outra empresa', async () => {
    findUnique.mockResolvedValue({ overAgentCompanyId: 'lavai-borbulha' });

    await expect(
      service.assertAgentBelongsToCompany('borbulha', 'agente-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recusa quando o agente não existe', async () => {
    getAgent.mockResolvedValue(null);

    await expect(
      service.assertAgentBelongsToCompany('cabistani', 'agente-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
