import { ConflictException } from '@nestjs/common';
import { PromptSheetService } from './prompt-sheet.service';

describe('PromptSheetService', () => {
  const companyId = 'company-1';
  const updatedAt = new Date('2026-09-25T12:00:00.000Z');
  const sheetId = 'sheet-1';

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
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  };
  let service: PromptSheetService;
  let tx: {
    company: { findUnique: jest.Mock };
    promptSheet: { create: jest.Mock; update: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ serviceModel: 'SELF_SERVICE' }),
      },
      promptSheet: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
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
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    service = new PromptSheetService(prisma as any);
  });

  it('cria a linha da empresa quando não existe e grava answers[key]', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    tx.promptSheet.create.mockResolvedValue({
      companyId,
      draftKey: 'draft',
      serviceModel: 'SELF_SERVICE',
      answers: { name: 'Lav Confirmada' },
      updatedAt,
    });

    const result = await service.putAnswer(companyId, 'draft', 'name', 'Lav Confirmada');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.promptSheet.create).toHaveBeenCalledWith({
      data: {
        companyId,
        draftKey: 'draft',
        serviceModel: 'SELF_SERVICE',
        answers: { name: 'Lav Confirmada' },
      },
    });
    expect(result.answers).toEqual({ name: 'Lav Confirmada' });
    expect(result.serviceModel).toBe('SELF_SERVICE');
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.address.update).not.toHaveBeenCalled();
    expect(prisma.openingHours.update).not.toHaveBeenCalled();
  });

  it('não chama company.update, address.update nem openingHours.update ao gravar', async () => {
    tx.$queryRaw.mockResolvedValue([
      { id: sheetId, answers: { name: 'Antigo' }, updatedAt },
    ]);
    tx.promptSheet.update.mockResolvedValue({
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

  it('lê de volta o mesmo JSON com snapshot do cadastro e serviceModel da empresa', async () => {
    const answers = { name: 'Lav Confirmada', phone: '11999999999' };
    prisma.promptSheet.findUnique.mockResolvedValue({
      serviceModel: 'CONVENTIONAL',
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
    tx.$queryRaw.mockResolvedValue([]);
    tx.promptSheet.create
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

    expect(tx.promptSheet.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ draftKey: 'draft' }),
      }),
    );
    expect(tx.promptSheet.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ draftKey: 'lavai-agent-99' }),
      }),
    );
  });

  it('applyAcceptedAnswer muda só a chave informada', async () => {
    tx.$queryRaw.mockResolvedValue([
      {
        id: sheetId,
        answers: { name: 'Lav Antiga', phone: '11999999999' },
        updatedAt,
      },
    ]);
    tx.promptSheet.update.mockResolvedValue({
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

    expect(tx.promptSheet.update).toHaveBeenCalledWith({
      where: { id: sheetId },
      data: {
        answers: { name: 'Lav Nova', phone: '11999999999' },
        serviceModel: 'SELF_SERVICE',
      },
    });
    expect(result.answers).toEqual({ name: 'Lav Nova', phone: '11999999999' });
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.address.update).not.toHaveBeenCalled();
    expect(prisma.openingHours.update).not.toHaveBeenCalled();
  });

  it('applyAcceptedAnswer recusa se a ficha mudou depois da proposta', async () => {
    tx.$queryRaw.mockResolvedValue([
      {
        id: sheetId,
        answers: { name: 'Lav' },
        updatedAt: new Date('2026-09-25T14:00:00.000Z'),
      },
    ]);

    await expect(
      service.applyAcceptedAnswer(
        companyId,
        'draft',
        'name',
        'Lav Nova',
        updatedAt.toISOString(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.promptSheet.update).not.toHaveBeenCalled();
    expect(tx.promptSheet.create).not.toHaveBeenCalled();
  });

  it('assertSheetUnchanged recusa se a ficha mudou mesmo sem answerKey', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue({
      updatedAt: new Date('2026-09-25T14:00:00.000Z'),
    });

    await expect(
      service.assertSheetUnchanged(companyId, 'draft', updatedAt.toISOString()),
    ).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    expect(prisma.promptSheet.upsert).not.toHaveBeenCalled();
  });

  it('assertSheetUnchanged aceita quando updatedAt bate', async () => {
    prisma.promptSheet.findUnique.mockResolvedValue({
      updatedAt,
    });

    await expect(
      service.assertSheetUnchanged(companyId, 'draft', updatedAt.toISOString()),
    ).resolves.toBeUndefined();
    expect(prisma.promptSheet.upsert).not.toHaveBeenCalled();
  });

  it('descarte não chama applyAcceptedAnswer', () => {
    const applySpy = jest.spyOn(service, 'applyAcceptedAnswer');
    expect((service as { discard?: unknown }).discard).toBeUndefined();
    expect(applySpy).not.toHaveBeenCalled();
    applySpy.mockRestore();
  });

  it('putAnswer devolve serviceModel da empresa, não o congelado na ficha', async () => {
    tx.company.findUnique.mockResolvedValue({ serviceModel: 'CONVENTIONAL' });
    tx.$queryRaw.mockResolvedValue([
      { id: sheetId, answers: {}, updatedAt },
    ]);
    tx.promptSheet.update.mockResolvedValue({
      companyId,
      draftKey: 'draft',
      serviceModel: 'SELF_SERVICE',
      answers: { name: 'X' },
      updatedAt,
    });

    const result = await service.putAnswer(companyId, 'draft', 'name', 'X');

    expect(result.serviceModel).toBe('CONVENTIONAL');
    expect(tx.promptSheet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ serviceModel: 'CONVENTIONAL' }),
      }),
    );
  });
});
