import { AgidezSalesService } from 'src/integrations/agidez/application/agidez-sales.service';
import { AgidezTicket } from 'src/integrations/agidez/api/agidez.types';

describe('AgidezSalesService.processSale', () => {
  const ticket = {
    CodigoLoja: 100,
    CodigoTicket: 148585,
    CodigoCliente: 13230,
    NomeCliente: 'Cliente',
    DDDCelular: '54',
    Celular: '999720202',
    DataEmissao: '2026-09-29T11:47:00',
    QuantidadeTotalPecas: 1,
    QuantidadeTotalPecasEntregues: 0,
    QuantidadeTotalServicos: 1,
    ValorTotalServicos: 227.5,
    DescontoTotalServicos: 0,
    ValorTotalProdutos: 0,
    DescontoTotalProdutos: 0,
  } satisfies AgidezTicket;

  it('não cria outro pedido quando o ticket já está gravado', async () => {
    const orderService = { create: jest.fn() };
    const customerIdentityService = { resolveForSale: jest.fn() };
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-existing' }),
      },
      orderItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            externalCode: '148585',
            name: 'Serviços de lavanderia',
          },
        ]),
      },
    };
    const service = new AgidezSalesService(
      {} as never,
      prisma as never,
      {} as never,
      customerIdentityService as never,
      orderService as never,
      {} as never,
      {} as never,
    );

    await service.processSale('company-1', ticket, [], []);

    expect(orderService.create).not.toHaveBeenCalled();
    expect(customerIdentityService.resolveForSale).not.toHaveBeenCalled();
  });
});
