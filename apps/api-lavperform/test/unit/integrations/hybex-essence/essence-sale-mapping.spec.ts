import {
  EssenceSaleMapping,
  essenceCustomerPhone,
  essenceExternalOrderId,
  essenceTicketIsCancelled,
  essenceTicketTotal,
} from '../../../../src/integrations/hybex-essence/mappings/essence-sale-mapping';
import { EssenceTicket } from '../../../../src/integrations/hybex-essence/api/essence.types';

describe('essence-sale-mapping', () => {
  const storeGuid = '1b160c42-536e-4850-a199-b4e80111bf37';

  it('monta externalOrderId estável', () => {
    expect(essenceExternalOrderId(storeGuid, 229)).toBe(
      `essence:${storeGuid}:229`,
    );
  });

  it('detecta ticket cancelado', () => {
    const open: EssenceTicket = {
      Sequencia: 1,
      DataCriacao: '2026-11-16 18:58:16.000000',
      DataCancelado: '0001-01-01 00:00:00.000000',
    };
    const cancelled: EssenceTicket = {
      ...open,
      DataCancelado: '2026-11-16 19:00:00.000000',
    };
    expect(essenceTicketIsCancelled(open)).toBe(false);
    expect(essenceTicketIsCancelled(cancelled)).toBe(true);
  });

  it('formata telefone com DDD da loja', () => {
    expect(essenceCustomerPhone(['48984223201'], '48')).toBe('48984223201');
    expect(essenceCustomerPhone(['984223201'], '48')).toBe('48984223201');
  });

  it('mapeia pedido agregado quando não há itens na API', () => {
    const ticket: EssenceTicket = {
      Sequencia: 229,
      PrecoFinal: 90,
      Quantidade: 2,
      DataCriacao: '2026-11-16 18:58:16.000000',
      Cliente: { Nome: 'Cliente Teste', Codigo: '0000000001' },
    };

    expect(essenceTicketTotal(ticket)).toBe(90);

    const order = EssenceSaleMapping.toOrder(
      ticket,
      'customer-id',
      'company-id',
      storeGuid,
    );

    expect(order.salesChannel).toBe('HYBEX_ESSENCE');
    expect(order.total).toBe(90);
    expect(order.items).toHaveLength(1);
    expect(order.items?.[0].quantity).toBe(2);
    expect(order.items?.[0].totalPrice).toBe(90);
  });
});