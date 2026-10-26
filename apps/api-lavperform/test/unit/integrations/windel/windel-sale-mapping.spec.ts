import {
  windelDisplayId,
  windelIntegratorOrderId,
  windelMerchantId,
  windelSaleToOrder,
} from 'src/integrations/windel/mappings/windel-sale-mapping';
import { WindelServiceOrderDetail } from 'src/integrations/windel/api/windel.types';

function order(overrides: Partial<WindelServiceOrderDetail> = {}): WindelServiceOrderDetail {
  return {
    id: 1764549,
    numero: 5962,
    serie: 'OS',
    situacao: 'Atendido',
    valorTotal: 80,
    valorDesconto: 5,
    empresaId: 12,
    pessoaId: 9,
    pessoaNome: 'Ana',
    pessoaCpfCnpj: '123',
    createdAt: '2026-10-20T14:34:00.485Z',
    movDocs: [
      {
        xProd: 'Camisa',
        quantidade: 2,
        valorUnitario: 40,
        valorTotal: 80,
        servico: true,
      },
    ],
    formaDePagamentoDocs: [
      { valor: 80, formaDePagamento: { nome: 'PIX' } },
    ],
    ...overrides,
  };
}

describe('windel sale mapping', () => {
  it('usa id e numero quando cabem no inteiro de 32 bits', () => {
    expect(windelIntegratorOrderId(1764549)).toBe(1764549);
    expect(windelDisplayId(5962, 1764549)).toBe(5962);
    expect(windelMerchantId(12)).toBe(12);
  });

  it('faz hash do id que não cabe e usa esse hash como display quando o numero falha', () => {
    const hashed = windelIntegratorOrderId('os-grande');
    expect(hashed).toBeGreaterThan(0);
    expect(hashed).toBeLessThanOrEqual(2147483647);
    expect(windelDisplayId(0, hashed)).toBe(hashed);
    expect(windelMerchantId(undefined)).toBe(0);
  });

  it('monta pedido fechado de retirada com item, desconto e pagamento', () => {
    const dto = windelSaleToOrder(order(), { telefone: '11999999999', email: 'a@b.co' }, 'customer-1', 'company-1');

    expect(dto).toEqual(
      expect.objectContaining({
        integratorOrderId: 1764549,
        displayId: 5962,
        merchantId: 12,
        status: 'closed',
        orderType: 'takeout',
        orderTiming: 'immediate',
        salesChannel: 'WINDEL',
        customerOrigin: 'windel',
        total: 80,
        companyId: 'company-1',
        customerId: 'customer-1',
        observation: 'Windel | Série: OS | Número: 5962',
      }),
    );
    expect(dto.items?.[0]).toEqual(
      expect.objectContaining({
        name: 'Camisa',
        quantity: 2,
        unitPrice: 40,
        totalPrice: 80,
        kind: 'service',
        status: 'closed',
      }),
    );
    expect(dto.discounts).toEqual([
      { type: 'discount', value: 5, description: 'Desconto Windel' },
    ]);
    expect(dto.payments?.[0]).toEqual(
      expect.objectContaining({
        total: 80,
        paymentType: 'PIX',
        paymentMethod: 'PIX',
        status: 'paid',
        paymentFee: 0,
      }),
    );
  });

  it('usa um item e um pagamento unknown quando a ordem vem vazia', () => {
    const dto = windelSaleToOrder(
      order({ movDocs: [], formaDePagamentoDocs: [], valorDesconto: 0, pessoaNome: ' ' }),
      null,
      null,
      'company-1',
    );

    expect(dto.items?.[0]).toEqual(
      expect.objectContaining({ name: 'Ordem de serviço', quantity: 1, totalPrice: 80, kind: 'product' }),
    );
    expect(dto.payments?.[0].paymentMethod).toBe('unknown');
    expect(dto.discounts).toEqual([]);
  });

  it('troca nome de item vazio por Item e produto quando servico é falso', () => {
    const dto = windelSaleToOrder(
      order({
        movDocs: [{ xProd: '  ', quantidade: 1, valorUnitario: 10, valorTotal: 10, servico: false }],
        valorDesconto: 0,
        formaDePagamentoDocs: [],
        valorTotal: 10,
      }),
      null,
      null,
      'company-1',
    );

    expect(dto.items?.[0].name).toBe('Item');
    expect(dto.items?.[0].kind).toBe('product');
  });
});
