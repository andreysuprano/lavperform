import { safeFormatPhoneNumber } from 'src/common/utils/formatters';
import { AgidezTicket, AgidezServico } from 'src/integrations/agidez/api/agidez.types';
import {
  AgidezSaleMapping,
  agidezIntegratorOrderId,
  agidezItemName,
  agidezLegacyRawPhone,
  agidezPhone,
  agidezTicketNetTotal,
  dedupeServices,
} from 'src/integrations/agidez/mappings/agidez-sale-mapping';
import { resolveStoreDdd } from 'src/integrations/agidez/mappings/store-ddd';

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
  it('completa celular de 9 dígitos com o DDD da loja', () => {
    expect(agidezPhone('   ', '999195984', '54')).toBe('54999195984');
    expect(safeFormatPhoneNumber(agidezPhone('   ', '999195984', '54'))).toBe(
      '5554999195984',
    );
    expect(safeFormatPhoneNumber(agidezLegacyRawPhone('   ', '999195984'))).toBe(
      '559999195984',
    );
    expect(agidezPhone('51   ', '999195984', '54')).toBe('51999195984');
    expect(agidezPhone('   ', '34512449', '54')).toBe('34512449');
    expect(agidezLegacyRawPhone('54   ', '999195984')).toBeUndefined();
  });

  it('resolve o DDD pela cidade da empresa', () => {
    expect(resolveStoreDdd('Farroupilha', 'RS')).toBe('54');
    expect(resolveStoreDdd('Bento Gonçalves', 'rs')).toBe('54');
    expect(resolveStoreDdd('Porto Alegre', 'RS')).toBeUndefined();
    expect(resolveStoreDdd('', 'RS')).toBeUndefined();
  });

  it('usa o nome da peça quando o serviço é genérico', () => {
    expect(agidezItemName('*LAVANDERIA', 'PDV BANHO')).toBe('PDV BANHO');
    expect(agidezItemName('QUILO DE ROUPA', '*KG PEÇA LAVAR E SECAR')).toBe(
      'QUILO DE ROUPA',
    );
    expect(agidezItemName('*LAVANDERIA', '')).toBe('*LAVANDERIA');
  });

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
    expect(withServices.externalOrderId).toBe('agidez:100:148119');
    expect(withServices.status).toBe('confirmed');
    expect(withServices.total).toBe(7);
    expect(withServices.items).toHaveLength(1);
    expect(withServices.items?.[0].name).toBe('*LAVANDERIA');

    const withPiece = AgidezSaleMapping.toOrder(
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
      [
        {
          CodigoLoja: 100,
          CodigoTicket: 148119,
          Codigo: 10,
          NomePeca: 'PDV BANHO',
          Sequencia: 1,
          ValorUnitario: 3,
          ValorUnitarioComAcrescimoDescontoTicket: 3,
        },
      ],
    );
    expect(withPiece.items?.[0].name).toBe('PDV BANHO');
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
