import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { LavaiAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';
import type { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import type { ConfigService } from '@nestjs/config';
import type { PromptSheetService } from './prompt-sheet.service';

describe('AiAgentService.createAgent: empresa no LavAI Agent', () => {
  let prisma: { company: { findUnique: jest.Mock; update: jest.Mock }; whatsappInstance: { findUnique: jest.Mock } };
  let lavai: { getCompany: jest.Mock; listCompanies: jest.Mock; createCompany: jest.Mock; createAgent: jest.Mock };
  let service: AiAgentService;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'empresa-1',
          name: 'Lavanderia Centro',
          slug: 'lavanderia-centro',
          email: null,
          phone: '11999999999',
          overAgentCompanyId: 'id-orfao',
        }),
        update: jest.fn(),
      },
      whatsappInstance: { findUnique: jest.fn().mockResolvedValue({ name: 'centro', token: 't' }) },
    };
    lavai = {
      getCompany: jest.fn().mockRejectedValue(new NotFoundException()),
      listCompanies: jest.fn().mockResolvedValue([{ id: 'outra', slug: 'outra' }]),
      createCompany: jest.fn().mockResolvedValue({ id: 'id-novo' }),
      createAgent: jest.fn().mockImplementation(async (companyId: string) => ({ id: 'agente-1', companyId })),
    };
    service = new AiAgentService(
      prisma as unknown as PrismaService,
      lavai as unknown as LavaiAgentApiService,
      { getWebhooks: jest.fn().mockResolvedValue([]), setWebhook: jest.fn() } as unknown as UazapiClient,
      { get: jest.fn() } as unknown as ConfigService,
      {} as PromptSheetService,
    );
  });

  const create = () => service.createAgent('empresa-1', { name: 'Aria' });

  function expectLinkedTo(id: string) {
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'empresa-1' },
      data: { overAgentCompanyId: id },
    });
    expect(lavai.createAgent).toHaveBeenCalledWith(id, { name: 'Aria' });
  }

  it('recria a empresa quando o ID gravado não existe mais', async () => {
    await create();

    expect(lavai.createCompany).toHaveBeenCalledWith({
      name: 'Lavanderia Centro',
      slug: 'lavanderia-centro',
      email: undefined,
      phone: '11999999999',
    });
    expectLinkedTo('id-novo');
  });

  it('religa à empresa de mesmo slug em vez de duplicar', async () => {
    lavai.listCompanies.mockResolvedValue([{ id: 'id-existente', slug: 'lavanderia-centro' }]);

    await create();

    expect(lavai.createCompany).not.toHaveBeenCalled();
    expectLinkedTo('id-existente');
  });

  it('provisiona a empresa que nunca foi provisionada', async () => {
    const company = await prisma.company.findUnique();
    prisma.company.findUnique.mockResolvedValue({ ...company, overAgentCompanyId: null });

    await create();

    expect(lavai.getCompany).not.toHaveBeenCalled();
    expectLinkedTo('id-novo');
  });

  it('não altera o vínculo quando a empresa existe', async () => {
    lavai.getCompany.mockResolvedValue({ id: 'id-orfao' });

    await create();

    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(lavai.createCompany).not.toHaveBeenCalled();
    expect(lavai.createAgent).toHaveBeenCalledWith('id-orfao', { name: 'Aria' });
  });

  it('não altera o vínculo quando o LavAI Agent está com falha', async () => {
    lavai.getCompany.mockRejectedValue(new InternalServerErrorException());

    await expect(create()).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(lavai.createCompany).not.toHaveBeenCalled();
    expect(lavai.createAgent).not.toHaveBeenCalled();
  });
});
