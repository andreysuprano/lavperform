import { ConsumerWebhookOrderMapping } from 'src/integrations/consumer/mappings/consumer-webhook-order.mapping';
import type { ConsumerWebhookPayload } from 'src/integrations/consumer/dto/consumer-webhook-payload.interface';

describe('ConsumerWebhookOrderMapping', () => {
  it('mapeia payload delivery com itens pai/filho para CreateOrderDto', () => {
    const payload: ConsumerWebhookPayload = {
      tipo: 'delivery',
      pedido: {
        codigo: '270807',
        numero: '0',
        dataabertura: '2026-03-03 14:10:33.6360',
        datafechamento: '2026-03-03 15:13:41.0150',
        totalservico: '0.0000',
        totalacrescimo: null,
        valortotal: '15.9000',
        totaldesconto: '0.0000',
      },
      cliente: {
        codigo: '19887',
        nome: 'Silvia Valadão',
      },
      endereco: {
        logradouro: 'R. Dr. Querubino',
        numero: '288',
        complemento: 'Secretaria',
        bairro: 'Centro',
        cidade: 'Coronel Fabriciano',
        uf: 'MG',
        cep: null,
        referencia: 'Casa Grande',
      },
      delivery: {
        codigo: '270807',
        status: 'F',
        frete: '0.0000',
        observacao: 'obs',
        total: '15.9000',
      },
      itens: [
        {
          codigo: '1597627',
          codigopedido: '270807',
          quantidade: '1.0000',
          valorunitario: '15.9000',
          valortotal: '15.9000',
          nomeproduto: 'TORTINHA DE FRANGO',
          codigopai: null,
        },
        {
          codigo: '1597628',
          codigopedido: '270807',
          quantidade: '1.0000',
          valorunitario: '0.0000',
          valortotal: '0.0000',
          nomeproduto: 'GUARDANAPO',
          codigopai: '1597627',
        },
      ],
    };

    const dto = ConsumerWebhookOrderMapping.toOrder(
      payload,
      'cust-1',
      'comp-1',
    );

    expect(dto).not.toBeNull();
    expect(dto!.integratorOrderId).toBe(270807);
    expect(dto!.companyId).toBe('comp-1');
    expect(dto!.customerId).toBe('cust-1');
    expect(dto!.status).toBe('closed');
    expect(dto!.orderType).toBe('delivery');
    expect(dto!.salesChannel).toBe('consumer');
    expect(dto!.total).toBe(15.9);
    expect(dto!.deliveryAddress?.street).toBe('R. Dr. Querubino');
    expect(dto!.items).toHaveLength(1);
    expect(dto!.items![0].name).toBe('TORTINHA DE FRANGO');
    expect(dto!.items![0].items).toHaveLength(1);
    expect(dto!.items![0].items![0].name).toBe('GUARDANAPO');
  });

  it('retorna null sem codigo de pedido', () => {
    expect(
      ConsumerWebhookOrderMapping.toOrder(
        { pedido: {} },
        'c',
        'co',
      ),
    ).toBeNull();
  });

  it('monta deliveryAddress só a partir do bloco delivery quando não há endereco na raiz', () => {
    const payload: ConsumerWebhookPayload = {
      tipo: 'delivery',
      pedido: {
        codigo: '273343',
        numero: '0',
        dataabertura: '2026-04-06 16:42:14.0940',
        datafechamento: '2026-04-06 17:20:01.9610',
        valortotal: '23.9900',
      },
      delivery: {
        codigo: '273343',
        status: 'F',
        frete: '3.0000',
        total: '20.9900',
        endereco: 'Rua Albert Scharlet',
        endereconumero: '1385',
        bairro: 'Centro',
        cidade: 'Coronel Fabriciano',
        uf: 'MG',
        cep: '35170-038',
      },
      itens: [
        {
          codigo: '1613573',
          quantidade: '1.0000',
          valorunitario: '20.9900',
          valortotal: '20.9900',
          nomeproduto: 'SANDUBA',
        },
      ],
    };

    const dto = ConsumerWebhookOrderMapping.toOrder(payload, 'cust-1', 'comp-1');
    expect(dto).not.toBeNull();
    expect(dto!.deliveryAddress?.street).toBe('Rua Albert Scharlet');
    expect(dto!.deliveryAddress?.number).toBe('1385');
    expect(dto!.deliveryAddress?.city).toBe('Coronel Fabriciano');
  });
});
