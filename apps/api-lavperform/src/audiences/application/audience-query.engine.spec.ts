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
});
