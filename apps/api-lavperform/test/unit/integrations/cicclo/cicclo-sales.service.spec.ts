import { CiccloSalesService } from 'src/integrations/cicclo/application/cicclo-sales.service';
import { CiccloSale } from 'src/integrations/cicclo/api/cicclo.types';

function buildSale(id = 501): CiccloSale {
  return {
    id,
    createdAt: '2026-10-05T12:00:00.000Z',
    description: 'Lavadora 01',
    machineType: 'Lavadora',
    amount: 18,
    count: 1,
    origin: 'app',
    dayOfWeek: 'Sunday',
    hourOfDay: 12,
    payment: {
      method: 'PIX',
      authCode: null,
      creditCardBrand: null,
      creditCardNumber: null,
      couponCode: null,
      voucherCode: null,
    },
    channels: { pos: false, app: true, totem: false, admin: false },
    store: { name: 'Loja', document: '000' },
    customer: {
      id: 9,
      name: 'Ana',
      document: null,
      email: null,
      mobile: null,
      birthDate: null,
      age: null,
      postalCode: null,
      registeredAt: null,
    },
  };
}

describe('CiccloSalesService processSale', () => {
  const prisma = {
    order: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const customerIdentityService = { resolveForSale: jest.fn() };
  const orderService = {
    findByIntegratorOrderId: jest.fn(),
    create: jest.fn(),
  };

  let service: CiccloSalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    customerIdentityService.resolveForSale.mockResolvedValue({ id: 'customer-1' });
    orderService.create.mockResolvedValue({ id: 'order-1' });
    service = new CiccloSalesService(
      {} as any,
      prisma as any,
      {} as any,
      customerIdentityService as any,
      orderService as any,
      {} as any,
      {} as any,
    );
  });

  it('grava integratorOrderId e não resolve cliente de novo na segunda passagem', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await service.processSale('company-1', buildSale());

    expect(orderService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        integratorOrderId: 501,
        displayId: 501,
        salesChannel: 'CICCLO',
        companyId: 'company-1',
      }),
    );

    prisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      integratorOrderId: 501,
    });

    await service.processSale('company-1', buildSale());

    expect(orderService.create).toHaveBeenCalledTimes(1);
    expect(customerIdentityService.resolveForSale).toHaveBeenCalledTimes(1);
  });

  it('não cria cópia quando o pedido antigo tem o id só no displayId', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-old',
      integratorOrderId: null,
    });
    prisma.order.update.mockResolvedValue({ id: 'order-old' });

    await service.processSale('company-1', buildSale(777));

    expect(orderService.create).not.toHaveBeenCalled();
    expect(customerIdentityService.resolveForSale).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-old' },
      data: { integratorOrderId: 777 },
    });
  });
});
