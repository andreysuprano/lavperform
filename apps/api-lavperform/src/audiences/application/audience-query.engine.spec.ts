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
});
