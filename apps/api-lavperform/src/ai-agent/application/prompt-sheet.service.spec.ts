import { PromptSheetService } from './prompt-sheet.service';

describe('PromptSheetService', () => {
  const companyId = 'company-1';
  const updatedAt = new Date('2026-09-25T12:00:00.000Z');

  const companyRow = {
    id: companyId,
    name: 'Lav Teste',
    phone: '11999999999',
    serviceModel: 'SELF_SERVICE' as const,
    address: {
      street: 'Rua A',
      number: '10',
      complement: null,
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
    },
    openingHours: [
      {
        dayOfWeek: 'segunda',
        openTime: '08:00',
        closeTime: '18:00',
        isOpen: true,
      },
    ],
  };

  let prisma: {
    company: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    address: { update: jest.Mock };
    openingHours: { update: jest.Mock };
    promptSheet: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let service: PromptSheetService;

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue(companyRow),
        update: jest.fn(),
      },
      address: { update: jest.fn() },
      openingHours: { update: jest.fn() },
      promptSheet: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new PromptSheetService(prisma as any);
  });

  it('cria a linha da empresa quando não existe e grava answers[key]', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue(null);
    prisma.promptSheet.upsert.mockResolvedValue({
      companyId,
      draftKey: 'draft',
      serviceModel: 'SELF_SERVICE',
      answers: { name: 'Lav Confirmada' },
      updatedAt,
    });

    const result = await service.putAnswer(companyId, 'draft', 'name', 'Lav Confirmada');

    expect(prisma.promptSheet.upsert).toHaveBeenCalledWith({
      where: { companyId_draftKey: { companyId, draftKey: 'draft' } },
      create: {
        companyId,
        draftKey: 'draft',
        serviceModel: 'SELF_SERVICE',
        answers: { name: 'Lav Confirmada' },
      },
      update: {
        answers: { name: 'Lav Confirmada' },
      },
    });
    expect(result.answers).toEqual({ name: 'Lav Confirmada' });
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.address.update).not.toHaveBeenCalled();
    expect(prisma.openingHours.update).not.toHaveBeenCalled();
  });

  it('não chama company.update, address.update nem openingHours.update ao gravar', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue({
      answers: { name: 'Antigo' },
      serviceModel: 'SELF_SERVICE',
    });
    prisma.promptSheet.upsert.mockResolvedValue({
      companyId,
      draftKey: 'draft',
      serviceModel: 'SELF_SERVICE',
      answers: { name: 'Antigo', phone: '11888888888' },
      updatedAt,
    });

    await service.putAnswer(companyId, 'draft', 'phone', '11888888888');

    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.address.update).not.toHaveBeenCalled();
    expect(prisma.openingHours.update).not.toHaveBeenCalled();
  });

  it('lê de volta o mesmo JSON com snapshot do cadastro', async () => {
    const answers = { name: 'Lav Confirmada', phone: '11999999999' };
    prisma.promptSheet.findUnique.mockResolvedValue({
      serviceModel: 'SELF_SERVICE',
      answers,
      updatedAt,
    });

    const result = await service.get(companyId, 'draft');

    expect(result).toEqual({
      serviceModel: 'SELF_SERVICE',
      snapshot: {
        name: 'Lav Teste',
        phone: '11999999999',
        address: {
          street: 'Rua A',
          number: '10',
          complement: null,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
        },
        openingHours: [
          {
            dayOfWeek: 'segunda',
            openTime: '08:00',
            closeTime: '18:00',
            isOpen: true,
          },
        ],
      },
      answers,
      updatedAt,
    });
  });

  it('usa draftKey draft sem agente e o id do agente lavai quando informado', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue(null);
    prisma.promptSheet.upsert
      .mockResolvedValueOnce({
        companyId,
        draftKey: 'draft',
        serviceModel: 'SELF_SERVICE',
        answers: { name: 'A' },
        updatedAt,
      })
      .mockResolvedValueOnce({
        companyId,
        draftKey: 'lavai-agent-99',
        serviceModel: 'SELF_SERVICE',
        answers: { name: 'B' },
        updatedAt,
      });

    await service.putAnswer(companyId, 'draft', 'name', 'A');
    await service.putAnswer(companyId, 'lavai-agent-99', 'name', 'B');

    expect(prisma.promptSheet.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { companyId_draftKey: { companyId, draftKey: 'draft' } },
        create: expect.objectContaining({ draftKey: 'draft' }),
      }),
    );
    expect(prisma.promptSheet.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          companyId_draftKey: { companyId, draftKey: 'lavai-agent-99' },
        },
        create: expect.objectContaining({ draftKey: 'lavai-agent-99' }),
      }),
    );
  });

  it('applyAcceptedAnswer muda só a chave informada', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue({
      answers: { name: 'Lav Antiga', phone: '11999999999' },
      serviceModel: 'SELF_SERVICE',
      updatedAt,
    });
    prisma.promptSheet.upsert.mockResolvedValue({
      companyId,
      draftKey: 'draft',
      serviceModel: 'SELF_SERVICE',
      answers: { name: 'Lav Nova', phone: '11999999999' },
      updatedAt: new Date('2026-09-25T13:00:00.000Z'),
    });

    const result = await service.applyAcceptedAnswer(
      companyId,
      'draft',
      'name',
      'Lav Nova',
      updatedAt.toISOString(),
    );

    expect(prisma.promptSheet.upsert).toHaveBeenCalledWith({
      where: { companyId_draftKey: { companyId, draftKey: 'draft' } },
      create: {
        companyId,
        draftKey: 'draft',
        serviceModel: 'SELF_SERVICE',
        answers: { name: 'Lav Nova', phone: '11999999999' },
      },
      update: {
        answers: { name: 'Lav Nova', phone: '11999999999' },
      },
    });
    expect(result.answers).toEqual({ name: 'Lav Nova', phone: '11999999999' });
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.address.update).not.toHaveBeenCalled();
    expect(prisma.openingHours.update).not.toHaveBeenCalled();
  });

  it('applyAcceptedAnswer recusa se a ficha mudou depois da proposta', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue({
      answers: { name: 'Lav' },
      serviceModel: 'SELF_SERVICE',
      updatedAt: new Date('2026-09-25T14:00:00.000Z'),
    });

    await expect(
      service.applyAcceptedAnswer(
        companyId,
        'draft',
        'name',
        'Lav Nova',
        updatedAt.toISOString(),
      ),
    ).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    expect(prisma.promptSheet.upsert).not.toHaveBeenCalled();
  });

  it('descarte não chama applyAcceptedAnswer', () => {
    const applySpy = jest.spyOn(service, 'applyAcceptedAnswer');
    // Descarte é só no cliente (limpa proposta local + thread discard).
    // Este serviço não tem método de descarte que grave a ficha.
    expect((service as { discard?: unknown }).discard).toBeUndefined();
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });
});
