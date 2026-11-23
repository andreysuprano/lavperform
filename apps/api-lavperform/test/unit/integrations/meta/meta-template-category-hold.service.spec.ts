import { MetaTemplateCategory } from '@prisma/client';
import { MetaTemplateCategoryHoldService } from 'src/integrations/meta/application/meta-template-category-hold.service';

describe('MetaTemplateCategoryHoldService', () => {
  const tx = {
    metaMessageTemplate: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    automaticCampaign: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma: any = {
    metaMessageTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  const service = new MetaTemplateCategoryHoldService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pausa a campanha quando utilidade vira marketing', async () => {
    prisma.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.UTILITY,
    });
    tx.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.UTILITY,
    });
    tx.automaticCampaign.findMany.mockResolvedValue([
      { id: 'camp', name: 'Reativação', companyId: 'co' },
    ]);

    await service.apply('tpl', 'MARKETING');

    expect(tx.metaMessageTemplate.update).toHaveBeenCalledWith({
      where: { id: 'tpl' },
      data: { category: MetaTemplateCategory.MARKETING },
    });
    expect(tx.automaticCampaign.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['camp'] } },
        data: expect.objectContaining({ active: false }),
      }),
    );
  });

  it('atualiza a categoria sem pausar no caminho inverso', async () => {
    prisma.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.MARKETING,
    });
    tx.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.MARKETING,
    });

    await service.apply('tpl', 'UTILITY');

    expect(tx.automaticCampaign.findMany).not.toHaveBeenCalled();
    expect(tx.automaticCampaign.updateMany).not.toHaveBeenCalled();
  });

  it('não pausa de novo uma campanha que já tem a data', async () => {
    prisma.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.UTILITY,
    });
    tx.metaMessageTemplate.findUnique.mockResolvedValue({
      id: 'tpl',
      category: MetaTemplateCategory.UTILITY,
    });
    tx.automaticCampaign.findMany.mockResolvedValue([]);

    await service.apply('tpl', 'marketing');

    expect(tx.automaticCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ metaCategoryHoldAt: null }),
      }),
    );
    expect(tx.automaticCampaign.updateMany).not.toHaveBeenCalled();
  });
});
