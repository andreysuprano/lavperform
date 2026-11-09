import {
  waymoneyCycleToOrder,
  waymoneyIntegratorOrderId,
  waymoneyPackageToOrder,
} from 'src/integrations/waymoney/mappings/waymoney-sale-mapping';
import { WaymoneyPayment } from 'src/integrations/waymoney/api/waymoney.types';

const payment = (overrides: Partial<WaymoneyPayment> = {}): WaymoneyPayment => ({
  id: 'pay-1',
  finalTotal: 16.9,
  discount: 0,
  createdAt: '2026-11-09T13:37:55.116Z',
  paymentMethod: 'CREDIT',
  machine: { name: 'Lavadora 1', type: 'WASHER' },
  branch: { name: 'Lavanderize' },
  ...overrides,
});

describe('mapeamento WayMoney', () => {
  it('grava ciclo como retirada fechada e paga, com a filial na observação', () => {
    const order = waymoneyCycleToOrder(payment(), 'customer-1', 'company-1');

    expect(order).toEqual(
      expect.objectContaining({
        salesChannel: 'WAYMONEY',
        customerOrigin: 'waymoney',
        orderType: 'takeout',
        orderTiming: 'immediate',
        status: 'closed',
        total: 16.9,
        merchantId: 0,
        customerId: 'customer-1',
        companyId: 'company-1',
        displayId: order.integratorOrderId,
        observation: 'WayMoney | Lavanderize | Lavadora 1',
      }),
    );
    expect(order.payments).toEqual([
      expect.objectContaining({
        status: 'paid',
        total: 16.9,
        paymentMethod: 'Cartão de crédito',
        paymentType: 'Cartão de crédito',
      }),
    ]);
    expect(order.items?.[0]).toEqual(
      expect.objectContaining({
        name: 'Lavadora 1',
        kind: 'service',
        quantity: 1,
        status: 'closed',
      }),
    );
  });

  it('usa o tipo da máquina quando o nome falta', () => {
    expect(
      waymoneyCycleToOrder(
        payment({ machine: { name: ' ', type: 'WASHER' }, machineName: null }),
        null,
        'company-1',
      ).items?.[0]?.name,
    ).toBe('Lavadora');
    expect(
      waymoneyCycleToOrder(
        payment({ machine: { type: 'DRYER' } }),
        null,
        'company-1',
      ).items?.[0]?.name,
    ).toBe('Secadora');
    expect(
      waymoneyCycleToOrder(
        payment({ machine: { type: 'OTHER' }, machineName: '' }),
        null,
        'company-1',
      ).items?.[0]?.name,
    ).toBe('Máquina');
  });

  it('arredonda o desconto em centavos', () => {
    const order = waymoneyCycleToOrder(
      payment({ discount: 1.236 }),
      null,
      'company-1',
    );
    expect(order.discounts).toEqual([
      { type: 'discount', value: 1.24, description: 'Desconto WayMoney' },
    ]);
  });

  it('separa o hash de ciclo e de pacote', () => {
    expect(waymoneyIntegratorOrderId('payment', 'abc')).not.toBe(
      waymoneyIntegratorOrderId('package', 'abc'),
    );
  });

  it('mapeia compra de pacote com valor, item de produto e método desconhecido', () => {
    const order = waymoneyPackageToOrder(
      {
        id: 'pkg-1',
        amount: 90,
        packageName: '  ',
        paymentMethod: 'BOLETO',
        createdAt: '2026-11-09T13:00:00.000Z',
        branch: { name: 'Lavanderize 2' },
      },
      null,
      'company-1',
    );

    expect(order.total).toBe(90);
    expect(order.observation).toBe('WayMoney | Lavanderize 2 | Pacote');
    expect(order.items?.[0]).toEqual(
      expect.objectContaining({ name: 'Compra de pacote', kind: 'product' }),
    );
    expect(order.payments?.[0]?.paymentMethod).toBe('BOLETO');
  });
});
