import { AgidezTicket, AgidezServico } from 'src/integrations/agidez/api/agidez.types';
import {
  AgidezSaleMapping,
  agidezIntegratorOrderId,
  agidezPhone,
  agidezTicketNetTotal,
  dedupeServices,
} from 'src/integrations/agidez/mappings/agidez-sale-mapping';

function ticket(overrides: Partial<AgidezTicket> = {}): AgidezTicket {
  return {
    CodigoLoja: 100,
    CodigoTicket: 148119,
    CodigoCliente: 652,
    NomeCliente: 'POUSADA CASA TASCA',
    DDDCelular: '54   ',
    Celular: '34531883',
    DataEmissao: '2026-09-21T08:24:00',
    QuantidadeTotalPecas: 2,
    QuantidadeTotalPecasEntregues: 0,
    QuantidadeTotalServicos: 2,
    ValorTotalServicos: 8,
    DescontoTotalServicos: 1,
    ValorTotalProdutos: 0,
    DescontoTotalProdutos: 0,
    ...overrides,
  };
}

describe('agidez-sale-mapping', () => {
  it('monta o telefone com DDD preenchido com espaços', () => {
    expect(agidezPhone('54   ', '34531883')).toBe('5434531883');
    expect(agidezPhone('   ', '')).toBeUndefined();
  });

  it('calcula o total líquido do ticket', () => {
    expect(agidezTicketNetTotal(ticket())).toBe(7);
  });

  it('deduplica serviços pela peça e sequência', () => {
    const service = {
      CodigoLoja: 100,
      CodigoTicket: 148119,
      TicketPecaIndividual: 10,
      Sequencia: 1,
      ValorUnitario: 3,
      DescontoUnitario: 0,
      DataDisponibilizacao: null,
      ValorUnitarioComAcrescimoDescontoTicket: 3,
      NomeServico: '*LAVANDERIA',
    } satisfies AgidezServico;

    expect(dedupeServices([service, { ...service }])).toHaveLength(1);
  });

  it('gera o pedido a partir dos serviços e cai no total do ticket sem itens', () => {
    const withServices = AgidezSaleMapping.toOrder(
      ticket(),
      [
        {
          CodigoLoja: 100,
          CodigoTicket: 148119,
          TicketPecaIndividual: 10,
          Sequencia: 1,
          ValorUnitario: 3,
          DescontoUnitario: 0,
          DataDisponibilizacao: null,
          ValorUnitarioComAcrescimoDescontoTicket: 3,
          NomeServico: '*LAVANDERIA',
        },
      ],
      [],
      'customer-1',
      'company-1',
    );

    expect(withServices.salesChannel).toBe('AGIDEZ');
    expect(withServices.status).toBe('confirmed');
    expect(withServices.total).toBe(7);
    expect(withServices.items).toHaveLength(1);
    expect(withServices.items?.[0].name).toBe('*LAVANDERIA');
    expect(withServices.integratorOrderId).toBe(agidezIntegratorOrderId(100, 148119));
    expect(withServices.discounts).toEqual([
      { type: 'discount', value: 1, description: 'Desconto Agidez' },
    ]);

    const headerOnly = AgidezSaleMapping.toOrder(
      ticket({
        QuantidadeTotalPecas: 1,
        QuantidadeTotalPecasEntregues: 1,
      }),
      [],
      [],
      null,
      'company-1',
    );
    expect(headerOnly.status).toBe('closed');
    expect(headerOnly.items?.[0].name).toBe('Serviços de lavanderia');
    expect(headerOnly.items?.[0].totalPrice).toBe(7);
  });
});
