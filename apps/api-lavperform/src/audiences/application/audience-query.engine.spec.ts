import { AudienceQueryEngine } from './audience-query.engine';
import { AudienceDefinition, ComparisonOperator } from '../domain/audience-definition.types';

describe('AudienceQueryEngine', () => {
  const prisma = {
    customer: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  } as any;

  let engine: AudienceQueryEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new AudienceQueryEngine(prisma);
  });

  it('validates audience definition version', () => {
    expect(() => engine.validateDefinition({ version: 2, include: { operator: 'AND', rules: [] } }))
      .toThrow('Versão da definição de audiência não suportada');
  });

  it('resolves include AND group by intersecting criterion ids', async () => {
    prisma.customer.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([{ id: 'b' }, { id: 'c' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          { type: 'has_orders', operator: 'eq', value: true },
          { type: 'whatsapp_verified', operator: 'eq', value: true },
        ],
      },
    };

    const ids = await engine.resolveCustomerIds('company-1', definition);
    expect(ids).toEqual(['b']);
  });

  it('subtracts exclude group from include group', async () => {
    prisma.customer.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([{ id: 'b' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'OR',
        rules: [{ type: 'has_orders', operator: 'eq', value: true }],
      },
      exclude: {
        operator: 'OR',
        rules: [{ type: 'whatsapp_verified', operator: 'eq', value: false }],
      },
    };

    const ids = await engine.resolveCustomerIds('company-1', definition);
    expect(ids).toEqual(['a']);
  });

  it('validates birthday_within_days and top_customers_month criteria', () => {
    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'birthday_within_days', operator: 'within_days', value: 30 }],
        },
      }),
    ).not.toThrow();

    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'top_customers_month', operator: 'eq', value: 10 }],
        },
      }),
    ).not.toThrow();

    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'birthday_within_days', operator: 'eq', value: 30 }],
        },
      }),
    ).toThrow('Operador inválido');
  });

  it('resolves birthday_within_days via raw query', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'b1' }, { id: 'b2' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'birthday_within_days', operator: 'within_days', value: 7 }],
      },
    };

    const ids = await engine.resolveCustomerIds('company-1', definition);
    expect(ids).toEqual(['b1', 'b2']);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('resolves top_customers_month via raw query with limit', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 't1' }, { id: 't2' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'top_customers_month', operator: 'eq', value: 10 }],
      },
    };

    const ids = await engine.resolveCustomerIds('company-1', definition);
    expect(ids).toEqual(['t1', 't2']);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('validates phone_ddd criterion operators', () => {
    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'phone_ddd', operator: 'in', value: ['11', '21'] }],
        },
      }),
    ).not.toThrow();

    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'phone_ddd', operator: 'eq', value: ['11'] }],
        },
      }),
    ).toThrow('Operador inválido');
  });

  it('resolves phone_ddd in with startsWith prefixes', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'p1' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'phone_ddd', operator: 'in', value: ['11', '21'] }],
      },
    };

    const ids = await engine.resolveCustomerIds('company-1', definition);
    expect(ids).toEqual(['p1']);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        OR: [
          { phone: { startsWith: '5511' } },
          { phone: { startsWith: '5521' } },
        ],
      },
      select: { id: true },
    });
  });

  it('resolves phone_ddd not_in excluding matching prefixes', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'p2' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'phone_ddd', operator: 'not_in', value: ['11'] }],
      },
    };

    await engine.resolveCustomerIds('company-1', definition);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        AND: [
          { phone: { not: null } },
          { NOT: { OR: [{ phone: { startsWith: '5511' } }] } },
        ],
      },
      select: { id: true },
    });
  });

  it('rejects invalid phone_ddd values', async () => {
    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'phone_ddd', operator: 'in', value: ['1'] }],
      },
    };

    await expect(engine.resolveCustomerIds('company-1', definition)).rejects.toThrow(
      'DDD inválido',
    );
  });

  it('paginates previewCustomers sample and meta', async () => {
    const allIds = Array.from({ length: 55 }, (_, index) => ({ id: `c${index + 1}` }));
    prisma.customer.findMany
      .mockResolvedValueOnce(allIds)
      .mockResolvedValueOnce(
        allIds.slice(50, 55).map((row) => ({
          ...row,
          name: row.id,
          phone: null,
          email: null,
          rfvClassification: null,
          address: null,
        })),
      );

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [{ type: 'has_orders', operator: 'eq', value: true }],
      },
    };

    const result = await engine.previewCustomers('company-1', definition, {
      page: 2,
      limit: 50,
    });

    expect(result.count).toBe(55);
    expect(result.sample).toHaveLength(5);
    expect(result.sample.map((row) => row.id)).toEqual([
      'c51',
      'c52',
      'c53',
      'c54',
      'c55',
    ]);
    expect(result.meta).toEqual({
      total: 55,
      page: 2,
      limit: 50,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(prisma.customer.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: { in: ['c51', 'c52', 'c53', 'c54', 'c55'] } },
      }),
    );
  });

  it('allows last_order_days between without required dates', () => {
    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'last_order_days', operator: 'between', value: {} }],
        },
      }),
    ).not.toThrow();
  });

  it('resolves last_order_days between with optional date range', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'd1' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'last_order_days',
            operator: 'between',
            value: { from: '2026-01-01', to: '2026-01-31' },
          },
        ],
      },
    };

    await engine.resolveCustomerIds('company-1', definition);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        AND: [
          {
            orders: {
              some: {
                createdAt: {
                  gte: new Date(Date.UTC(2026, 0, 1)),
                  lt: new Date(Date.UTC(2026, 1, 1)),
                },
              },
            },
          },
          {
            orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 1, 1)) } } },
          },
        ],
      },
      select: { id: true },
    });
  });

  it('resolves last_order_days between with only start date', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'd2' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          { type: 'last_order_days', operator: 'between', value: { from: '2026-03-01' } },
        ],
      },
    };

    await engine.resolveCustomerIds('company-1', definition);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        AND: [{ orders: { some: { createdAt: { gte: new Date(Date.UTC(2026, 2, 1)) } } } }],
      },
      select: { id: true },
    });
  });

  it('allows last_order_days gte without required days or dates', () => {
    expect(() =>
      engine.validateDefinition({
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'last_order_days', operator: 'gte', value: {} }],
        },
      }),
    ).not.toThrow();
  });

  it('combines last_order_days operator with optional date range', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'd3' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'last_order_days',
            operator: 'gte',
            value: { days: 30, from: '2026-01-01', to: '2026-01-31' },
          },
        ],
      },
    };

    await engine.resolveCustomerIds('company-1', definition);
    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where.companyId).toBe('company-1');
    expect(where.AND).toHaveLength(3);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        {
          orders: {
            some: {
              createdAt: {
                gte: new Date(Date.UTC(2026, 0, 1)),
                lt: new Date(Date.UTC(2026, 1, 1)),
              },
            },
          },
        },
        { orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 1, 1)) } } } },
      ]),
    );
  });

  it('resolves last_order_days gte with only a start date', async () => {
    prisma.customer.findMany.mockResolvedValueOnce([{ id: 'd4' }]);

    const definition: AudienceDefinition = {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          { type: 'last_order_days', operator: 'gte', value: { from: '2026-03-01' } },
        ],
      },
    };

    await engine.resolveCustomerIds('company-1', definition);
    expect(prisma.customer.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        AND: [{ orders: { some: { createdAt: { gte: new Date(Date.UTC(2026, 2, 1)) } } } }],
      },
      select: { id: true },
    });
  });

  describe('last_order_days operators and date range', () => {
    const now = new Date('2026-08-21T12:00:00.000Z');
    const januaryRange = [
      {
        orders: {
          some: {
            createdAt: {
              gte: new Date(Date.UTC(2026, 0, 1)),
              lt: new Date(Date.UTC(2026, 1, 1)),
            },
          },
        },
      },
      { orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 1, 1)) } } } },
    ];

    async function resolveWhere(operator: ComparisonOperator, value: unknown) {
      prisma.customer.findMany.mockResolvedValueOnce([{ id: 'x' }]);
      await engine.resolveCustomerIds('company-1', {
        version: 1,
        include: {
          operator: 'AND',
          rules: [{ type: 'last_order_days', operator, value }],
        },
      });
      return prisma.customer.findMany.mock.calls.at(-1)[0].where;
    }

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps legacy numeric gte as days since last order', async () => {
      const where = await resolveWhere('gte', 30);
      expect(where).toEqual({
        companyId: 'company-1',
        AND: [
          {
            orders: {
              none: { createdAt: { gte: new Date('2026-07-22T12:00:00.000Z') } },
            },
          },
        ],
      });
    });

    it.each(['eq', 'gt', 'gte', 'lt', 'lte'] as const)(
      'applies date range for operator %s without days',
      async (operator) => {
        const where = await resolveWhere(operator, {
          from: '2026-01-01',
          to: '2026-01-31',
        });
        expect(where).toEqual({
          companyId: 'company-1',
          AND: januaryRange,
        });
      },
    );

    it('applies only end date for lte', async () => {
      const where = await resolveWhere('lte', { to: '2026-01-31' });
      expect(where).toEqual({
        companyId: 'company-1',
        AND: [
          { orders: { some: {} } },
          { orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 1, 1)) } } } },
        ],
      });
    });

    it('applies only end date for between', async () => {
      const where = await resolveWhere('between', { to: '2026-01-31' });
      expect(where).toEqual({
        companyId: 'company-1',
        AND: [
          { orders: { some: {} } },
          { orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 1, 1)) } } } },
        ],
      });
    });

    it('ignores leftover empty dates and uses min/max days on between', async () => {
      const where = await resolveWhere('between', {
        from: '',
        to: '',
        min: 10,
        max: 40,
      });
      expect(where).toEqual({
        companyId: 'company-1',
        AND: [
          {
            orders: {
              none: { createdAt: { gte: new Date('2026-08-11T12:00:00.000Z') } },
            },
          },
          {
            orders: {
              some: { createdAt: { gte: new Date('2026-07-12T12:00:00.000Z') } },
            },
          },
        ],
      });
    });

    it('does not treat leftover days as a date range on between', async () => {
      const where = await resolveWhere('between', { days: 30 });
      expect(where).toEqual({
        companyId: 'company-1',
        orders: { some: {} },
      });
    });

    it('rejects inverted date range', async () => {
      await expect(
        resolveWhere('gte', { from: '2026-02-01', to: '2026-01-01' }),
      ).rejects.toThrow('Data inicial deve ser anterior ou igual à data final');
    });

    it('accepts a single-day range when from equals to', async () => {
      const where = await resolveWhere('eq', { from: '2026-01-15', to: '2026-01-15' });
      expect(where).toEqual({
        companyId: 'company-1',
        AND: [
          {
            orders: {
              some: {
                createdAt: {
                  gte: new Date(Date.UTC(2026, 0, 15)),
                  lt: new Date(Date.UTC(2026, 0, 16)),
                },
              },
            },
          },
          { orders: { none: { createdAt: { gte: new Date(Date.UTC(2026, 0, 16)) } } } },
        ],
      });
    });
  });
});
