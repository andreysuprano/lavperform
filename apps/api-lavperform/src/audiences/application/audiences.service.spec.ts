import { AudiencesService } from './audiences.service';
import { Audience } from '../domain/audience.entity';

describe('AudiencesService.findAll', () => {
  const validAudience = new Audience({
    id: 'ok',
    companyId: 'company-1',
    name: 'Hibernando',
    description: null,
    definition: {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'last_order_days', operator: 'gte', value: 30 }],
      },
    },
    createdAt: new Date('2026-07-30T00:00:00.000Z'),
    updatedAt: new Date('2026-07-30T00:00:00.000Z'),
  });

  const brokenAudience = new Audience({
    id: 'broken',
    companyId: 'company-1',
    name: 'CASHBACK Fidelidade',
    description: null,
    definition: {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'total_orders',
            operator: 'gte',
            value: 3,
            period: { from: '2026-10-31', to: '2026-10-15' },
          },
        ],
      },
    },
    createdAt: new Date('2026-08-21T00:00:00.000Z'),
    updatedAt: new Date('2026-11-05T00:00:00.000Z'),
  });

  it('keeps the other audiences when one count fails', async () => {
    const audienceRepository = {
      findAllWithFilters: jest.fn().mockResolvedValue({
        items: [validAudience, brokenAudience],
        total: 2,
      }),
    };
    const audienceQueryEngine = {
      countCustomers: jest
        .fn()
        .mockResolvedValueOnce(12)
        .mockRejectedValueOnce(
          new Error('Data inicial deve ser anterior ou igual à data final'),
        ),
    };

    const service = new AudiencesService(
      audienceRepository as any,
      audienceQueryEngine as any,
    );

    const result = await service.findAll('company-1', { page: 1, limit: 100 });

    expect(result.data.map((item) => item.name)).toEqual([
      'Hibernando',
      'CASHBACK Fidelidade',
    ]);
    expect(result.data[0].customerCount).toBe(12);
    expect(result.data[1].customerCount).toBeNull();
    expect(result.meta.total).toBe(2);
  });
});
