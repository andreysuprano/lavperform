import { AudienceQueryEngine } from './audience-query.engine';
import { AudienceDefinition } from '../domain/audience-definition.types';

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
});
