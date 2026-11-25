import {
  parseSwlMoney,
  swlAttendanceAction,
  swlExternalOrderId,
  swlHash,
  swlIntegratorOrderId,
  swlOrderDate,
  swlToOrder,
} from 'src/integrations/swl/mappings/swl-sale-mapping';
import { swlCustomerIncoming } from 'src/integrations/swl/mappings/swl-customer-mapping';
import { waymoneyHash } from 'src/integrations/waymoney/mappings/waymoney-sale-mapping';
import { SwlAtendimento, SwlCliente } from 'src/integrations/swl/api/swl.types';

const statusPagamento = (pagamento: string): SwlAtendimento['status'] => ({
  pagamento: pagamento as SwlAtendimento['status']['pagamento'],
  entrega: 'ENTREGUE',
});

const atendimento = (
  overrides: Partial<SwlAtendimento> = {},
): SwlAtendimento => ({
  id: 42,
  situacao: 'ATIVO',
  concluido: true,
  status: statusPagamento('PAGO'),
  clienteId: 7,
  centroDeCustoId: 3,
  datas: {
    abertura: '2026-08-27T09:13:00-03:00',
    previsaoEntrega: '2026-08-29T18:00:00-03:00',
    entrega: null,
  },
  atualizadoEm: '2026-08-28T10:00:00-03:00',
  valores: {
    quantidadePecas: 2,
    totalItens: 1,
    total: '75.50',
    descontoValor: '0.00',
    voucherFidelidade: '0.00',
    descontoPercentual: null,
    liquido: '75.50',
    pago: '75.50',
    creditoUtilizado: '0.00',
    entregaExpressa: '0.00',
  },
  itens: [
    {
      id: 900,
      itemId: 15,
      descricao: 'Lavagem de edredom',
      quantidade: '2.000',
      unidadeMedida: 'UN',
      valorUnitario: '37.75',
      valorTotal: '75.50',
      entregaExpressa: false,
    },
  ],
  pagamentos: [
    {
      id: 501,
      data: '2026-08-27',
      situacao: 'ATIVO',
      forma: 'Pix',
      valor: '75.50',
      valorAposTaxa: '75.50',
      registradoEm: '2026-08-27T09:20:00-03:00',
    },
  ],
  ...overrides,
});

const cliente = (overrides: Partial<SwlCliente> = {}): SwlCliente => ({
  id: 7,
  nome: 'Maria Souza',
  documento: '123.456.789-01',
  tipoDocumento: 'CPF',
  email: 'maria@exemplo.com',
  dataNascimento: '1990-05-17',
  sexo: 'F',
  celular: { original: '(47) 98850-9191', e164: '+5547988509191' },
  telefone: { original: '(47) 3333-4444', e164: '+554733334444' },
  endereco: {
    logradouro: 'Rua das Flores',
    numero: '100',
    complemento: 'Apto 2',
    bairro: 'Centro',
    cidade: 'Blumenau',
    uf: 'SC',
    cep: '89010-000',
  },
  ativo: true,
  whatsappOptin: true,
  atualizadoEm: '2026-08-28T10:00:00-03:00',
  ...overrides,
});

describe('mapeamento SWL', () => {
  describe('identidade e hash', () => {
    it('monta o externalOrderId com o prefixo swl', () => {
      expect(swlExternalOrderId(42)).toBe('swl:42');
    });

    it('usa o id da SWL como integratorOrderId quando cabe em inteiro de 32 bits', () => {
      expect(swlIntegratorOrderId(42)).toBe(42);
      expect(swlIntegratorOrderId(2147483647)).toBe(2147483647);
    });

    it('usa o hash positivo de swl:id quando o id sai da faixa', () => {
      const expected = waymoneyHash('swl:3000000000');
      expect(expected).toBeGreaterThan(0);
      expect(swlIntegratorOrderId(3000000000)).toBe(expected);
      expect(swlIntegratorOrderId(0)).toBe(waymoneyHash('swl:0'));
      expect(swlIntegratorOrderId(-5)).toBe(waymoneyHash('swl:-5'));
    });

    it('calcula o hash como a WayMoney, nunca zero e sempre positivo', () => {
      expect(swlHash('swl:3000000000')).toBe(waymoneyHash('swl:3000000000'));
      expect(swlHash('')).toBe(1);
      expect(swlHash('abc')).toBe(waymoneyHash('abc'));
    });
  });

  describe('dinheiro', () => {
    it('converte string decimal para número em centavos', () => {
      expect(parseSwlMoney('75.50')).toBe(75.5);
      expect(parseSwlMoney('1.236')).toBe(1.24);
      expect(parseSwlMoney('0.00')).toBe(0);
    });

    it('trata vazio, nulo e ilegível como zero', () => {
      expect(parseSwlMoney(null)).toBe(0);
      expect(parseSwlMoney(undefined)).toBe(0);
      expect(parseSwlMoney('')).toBe(0);
      expect(parseSwlMoney('  ')).toBe(0);
      expect(parseSwlMoney('abc')).toBe(0);
    });
  });

  describe('data do pedido', () => {
    it('usa a abertura do atendimento', () => {
      expect(swlOrderDate(atendimento()).toISOString()).toBe(
        new Date('2026-08-27T09:13:00-03:00').toISOString(),
      );
    });

    it('sem abertura, usa o registradoEm ativo mais cedo', () => {
      const date = swlOrderDate(
        atendimento({
          datas: { abertura: null },
          pagamentos: [
            {
              id: 3,
              situacao: 'INATIVO',
              forma: 'Pix',
              valor: '10.00',
              valorAposTaxa: '10.00',
              registradoEm: '2026-08-20T08:00:00-03:00',
            },
            {
              id: 2,
              situacao: 'ATIVO',
              forma: 'Pix',
              valor: '10.00',
              valorAposTaxa: '10.00',
              registradoEm: '2026-08-27T11:00:00-03:00',
            },
            {
              id: 1,
              situacao: 'ATIVO',
              forma: 'Pix',
              valor: '10.00',
              valorAposTaxa: '10.00',
              registradoEm: '2026-08-26T11:00:00-03:00',
            },
          ],
        }),
      );
      expect(date.toISOString()).toBe(
        new Date('2026-08-26T11:00:00-03:00').toISOString(),
      );
    });

    it('sem abertura e sem pagamento ativo, usa o atualizadoEm', () => {
      const date = swlOrderDate(
        atendimento({ datas: { abertura: null }, pagamentos: [] }),
      );
      expect(date.toISOString()).toBe(
        new Date('2026-08-28T10:00:00-03:00').toISOString(),
      );
    });
  });

  describe('ação do atendimento', () => {
    it('ATIVO + PAGO cria ou atualiza', () => {
      expect(swlAttendanceAction(atendimento(), false)).toBe('create');
      expect(swlAttendanceAction(atendimento(), true)).toBe('update');
    });

    it('INATIVO e EXCLUIDO cancelam o pedido existente e não criam', () => {
      expect(
        swlAttendanceAction(atendimento({ situacao: 'INATIVO' }), true),
      ).toBe('cancel');
      expect(
        swlAttendanceAction(atendimento({ situacao: 'EXCLUIDO' }), true),
      ).toBe('cancel');
      expect(
        swlAttendanceAction(atendimento({ situacao: 'INATIVO' }), false),
      ).toBe('skip');
      expect(
        swlAttendanceAction(atendimento({ situacao: 'EXCLUIDO' }), false),
      ).toBe('skip');
    });

    it('PARCIAL e EM_ABERTO só atualizam pedido existente', () => {
      for (const situacaoPagamento of ['PARCIAL', 'EM_ABERTO'] as const) {
        expect(
          swlAttendanceAction(
            atendimento({ status: statusPagamento(situacaoPagamento) }),
            false,
          ),
        ).toBe('skip');
        expect(
          swlAttendanceAction(
            atendimento({ status: statusPagamento(situacaoPagamento) }),
            true,
          ),
        ).toBe('update');
      }
    });

    it('situação desconhecida não cria nem cancela', () => {
      expect(
        swlAttendanceAction(
          atendimento({ situacao: 'NOVO_VALOR' as never }),
          false,
        ),
      ).toBe('skip');
      expect(
        swlAttendanceAction(
          atendimento({ situacao: 'NOVO_VALOR' as never }),
          true,
        ),
      ).toBe('update');
      expect(
        swlAttendanceAction(
          atendimento({ status: statusPagamento('NOVO_VALOR') }),
          false,
        ),
      ).toBe('skip');
      expect(
        swlAttendanceAction(
          atendimento({ status: statusPagamento('NOVO_VALOR') }),
          true,
        ),
      ).toBe('update');
    });
  });

  describe('pedido', () => {
    it('grava atendimento pago como retirada fechada da SWL', () => {
      const order = swlToOrder(
        atendimento(),
        'customer-1',
        'company-1',
        'Matriz',
      );

      expect(order).toEqual(
        expect.objectContaining({
          externalOrderId: 'swl:42',
          integratorOrderId: 42,
          displayId: 42,
          salesChannel: 'SWL',
          customerOrigin: 'swl',
          orderType: 'takeout',
          orderTiming: 'immediate',
          status: 'closed',
          total: 75.5,
          merchantId: 3,
          customerId: 'customer-1',
          companyId: 'company-1',
          observation: 'SWL | Matriz',
          deliveryFee: 0,
          serviceFee: 0,
          additionalFee: 0,
        }),
      );
      expect(order.createdAt.toISOString()).toBe(
        new Date('2026-08-27T09:13:00-03:00').toISOString(),
      );
      expect(order.updatedAt).toEqual(order.createdAt);
      expect(order.cancellationReason).toBeUndefined();
    });

    it('usa o hash de swl:id para id fora da faixa', () => {
      const order = swlToOrder(
        atendimento({ id: 3000000000 }),
        null,
        'company-1',
        'Matriz',
      );
      const expected = waymoneyHash('swl:3000000000');
      expect(order.externalOrderId).toBe('swl:3000000000');
      expect(order.integratorOrderId).toBe(expected);
      expect(order.displayId).toBe(expected);
      expect(order.customerId).toBeNull();
    });

    it('centro vazio usa merchantId 0 e observação com Centro de custo', () => {
      const order = swlToOrder(
        atendimento({ centroDeCustoId: null }),
        null,
        'company-1',
        '  ',
      );
      expect(order.merchantId).toBe(0);
      expect(order.observation).toBe('SWL | Centro de custo');
    });

    it('acrescenta a entrega expressa à observação sem somar taxas', () => {
      const order = swlToOrder(
        atendimento({
          valores: { ...atendimento().valores, entregaExpressa: '12.00' },
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.observation).toBe('SWL | Matriz | 12');
      expect(order.deliveryFee).toBe(0);
      expect(order.serviceFee).toBe(0);
      expect(order.additionalFee).toBe(0);
    });

    it('INATIVO grava cancelled com o motivo da SWL', () => {
      const order = swlToOrder(
        atendimento({ situacao: 'INATIVO' }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.status).toBe('cancelled');
      expect(order.cancellationReason).toBe('SWL INATIVO');
    });

    it('EXCLUIDO grava cancelled com o motivo da SWL', () => {
      const order = swlToOrder(
        atendimento({ situacao: 'EXCLUIDO' }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.status).toBe('cancelled');
      expect(order.cancellationReason).toBe('SWL EXCLUIDO');
    });

    it('PARCIAL reescreve como closed, sem cancelar', () => {
      const order = swlToOrder(
        atendimento({ status: statusPagamento('PARCIAL') }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.status).toBe('closed');
    });
  });

  describe('itens', () => {
    it('mantém quantidade inteira e o preço unitário', () => {
      const [item] = swlToOrder(
        atendimento(),
        null,
        'company-1',
        'Matriz',
      ).items!;
      expect(item).toEqual(
        expect.objectContaining({
          itemId: 15,
          externalCode: '900',
          name: 'Lavagem de edredom',
          quantity: 2,
          unitPrice: 37.75,
          totalPrice: 75.5,
          kind: 'service',
          status: 'closed',
        }),
      );
      expect(item.observation).toBeUndefined();
    });

    it('quantidade fracionada vira 1 com o total do item e guarda a original', () => {
      const [item] = swlToOrder(
        atendimento({
          itens: [
            {
              id: 901,
              itemId: null,
              descricao: '',
              quantidade: '2.500',
              unidadeMedida: 'KG',
              valorUnitario: '10.00',
              valorTotal: '25.00',
            },
          ],
        }),
        null,
        'company-1',
        'Matriz',
      ).items!;
      expect(item).toEqual(
        expect.objectContaining({
          itemId: 0,
          name: 'Serviço',
          quantity: 1,
          unitPrice: 25,
          totalPrice: 25,
        }),
      );
      expect(item.observation).toContain('2.500');
      expect(item.observation).toContain('KG');
    });

    it('quantidade ilegível vira 1 e total vazio vira 0', () => {
      const [item] = swlToOrder(
        atendimento({
          itens: [
            {
              id: 902,
              itemId: 1,
              descricao: 'Serviço X',
              quantidade: null,
              unidadeMedida: null,
              valorUnitario: null,
              valorTotal: null,
            },
          ],
        }),
        null,
        'company-1',
        'Matriz',
      ).items!;
      expect(item.quantity).toBe(1);
      expect(item.unitPrice).toBe(0);
      expect(item.totalPrice).toBe(0);
    });

    it('calcula o unitário pelo total quando valorUnitario vem vazio', () => {
      const [item] = swlToOrder(
        atendimento({
          itens: [
            {
              id: 903,
              itemId: 1,
              descricao: 'Serviço Y',
              quantidade: '4.000',
              unidadeMedida: 'UN',
              valorUnitario: '',
              valorTotal: '30.00',
            },
          ],
        }),
        null,
        'company-1',
        'Matriz',
      ).items!;
      expect(item.quantity).toBe(4);
      expect(item.unitPrice).toBe(7.5);
      expect(item.totalPrice).toBe(30);
    });
  });

  describe('descontos', () => {
    it('gera as linhas de desconto, voucher e percentual sobre o total bruto', () => {
      const order = swlToOrder(
        atendimento({
          valores: {
            ...atendimento().valores,
            total: '100.00',
            descontoValor: '10.00',
            voucherFidelidade: '5.00',
            descontoPercentual: '10.00',
          },
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.discounts).toEqual([
        { type: 'discount', value: 10, description: 'Desconto SWL' },
        { type: 'voucher', value: 5, description: 'Voucher fidelidade' },
        { type: 'discount', value: 10, description: 'Desconto percentual' },
      ]);
      expect(order.total).toBe(75.5);
    });

    it('não gera linha para valor zerado ou ausente', () => {
      expect(
        swlToOrder(atendimento(), null, 'company-1', 'Matriz').discounts,
      ).toEqual([]);
    });
  });

  describe('pagamentos', () => {
    it('deixa de fora pagamento inativo, excluído ou sem situação', () => {
      const order = swlToOrder(
        atendimento({
          pagamentos: [
            {
              id: 1,
              situacao: 'INATIVO',
              forma: 'Pix',
              valor: '75.50',
              valorAposTaxa: '75.50',
              registradoEm: '2026-08-27T09:20:00-03:00',
            },
            {
              id: 2,
              situacao: 'EXCLUIDO',
              forma: 'Pix',
              valor: '75.50',
              valorAposTaxa: '75.50',
              registradoEm: '2026-08-27T09:20:00-03:00',
            },
            {
              id: 3,
              situacao: null,
              forma: 'Pix',
              valor: '75.50',
              valorAposTaxa: '75.50',
              registradoEm: '2026-08-27T09:20:00-03:00',
            },
            {
              id: 4,
              situacao: 'ATIVO',
              forma: 'Cartão de crédito',
              valor: '75.50',
              valorAposTaxa: '73.24',
              registradoEm: '2026-08-27T09:21:00-03:00',
            },
          ],
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments).toEqual([
        {
          total: 75.5,
          paymentType: 'Cartão de crédito',
          status: 'paid',
          paymentMethod: 'Cartão de crédito',
          paymentFee: 2.26,
        },
      ]);
    });

    it('taxa é zero quando não há diferença positiva ou falta valorAposTaxa', () => {
      const order = swlToOrder(
        atendimento({
          pagamentos: [
            {
              id: 1,
              situacao: 'ATIVO',
              forma: '',
              valor: '50.00',
              valorAposTaxa: '55.00',
              registradoEm: null,
            },
            {
              id: 2,
              situacao: 'ATIVO',
              forma: 'Dinheiro',
              valor: '25.50',
              valorAposTaxa: null,
              registradoEm: null,
            },
          ],
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments).toEqual([
        expect.objectContaining({
          paymentMethod: 'Não informado',
          paymentType: 'Não informado',
          total: 50,
          paymentFee: 0,
        }),
        expect.objectContaining({
          paymentMethod: 'Dinheiro',
          total: 25.5,
          paymentFee: 0,
        }),
      ]);
    });

    it('crédito utilizado vira pagamento Crédito SWL', () => {
      const order = swlToOrder(
        atendimento({
          valores: { ...atendimento().valores, creditoUtilizado: '8.00' },
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments).toContainEqual({
        total: 8,
        paymentType: 'Crédito SWL',
        status: 'paid',
        paymentMethod: 'Crédito SWL',
        paymentFee: 0,
      });
      expect(order.payments).toHaveLength(2);
    });

    it('PAGO sem pagamento ativo nem crédito vira Fatura com o valor pago', () => {
      const order = swlToOrder(
        atendimento({
          pagamentos: [],
          valores: { ...atendimento().valores, pago: '70.00' },
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments).toEqual([
        {
          total: 70,
          paymentType: 'Fatura',
          status: 'paid',
          paymentMethod: 'Fatura',
          paymentFee: 0,
        },
      ]);
    });

    it('Fatura usa o líquido quando o pago é zero', () => {
      const order = swlToOrder(
        atendimento({
          pagamentos: [],
          valores: { ...atendimento().valores, pago: '0.00' },
        }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments?.[0]).toEqual(
        expect.objectContaining({ paymentMethod: 'Fatura', total: 75.5 }),
      );
    });

    it('atendimento não pago sem pagamento não ganha Fatura', () => {
      const order = swlToOrder(
        atendimento({ status: statusPagamento('EM_ABERTO'), pagamentos: [] }),
        null,
        'company-1',
        'Matriz',
      );
      expect(order.payments).toEqual([]);
    });
  });

  describe('cliente', () => {
    it('manda celular e164, documento e não leva whatsappOptin', () => {
      const incoming = swlCustomerIncoming(
        cliente({ documento: '12345678901' }),
      );

      expect(incoming).toEqual({
        name: 'Maria Souza',
        phone: '+5547988509191',
        cpf: '12345678901',
        email: 'maria@exemplo.com',
        birthDate: '1990-05-17',
        gender: 'F',
        address: {
          street: 'Rua das Flores',
          number: '100',
          complement: 'Apto 2',
          neighborhood: 'Centro',
          city: 'Blumenau',
          state: 'SC',
          zipCode: '89010-000',
        },
      });
      expect(Object.keys(incoming)).not.toContain('whatsappOptin');
    });

    it('mantém só dígitos no documento', () => {
      expect(swlCustomerIncoming(cliente()).cpf).toBe('12345678901');
    });

    it('sem e164 de celular, usa o telefone', () => {
      expect(
        swlCustomerIncoming(
          cliente({ celular: { original: null, e164: null } }),
        ).phone,
      ).toBe('+554733334444');
      expect(swlCustomerIncoming(cliente({ celular: null })).phone).toBe(
        '+554733334444',
      );
    });

    it('celular e164 inutilizável cai para o telefone', () => {
      expect(
        swlCustomerIncoming(
          cliente({ celular: { original: '123', e164: '+123' } }),
        ).phone,
      ).toBe('+554733334444');
    });

    it('sem telefone utilizável, phone fica ausente', () => {
      const incoming = swlCustomerIncoming(
        cliente({
          celular: { original: '123', e164: '+123' },
          telefone: { original: '456', e164: 'abc' },
        }),
      );
      expect(incoming.phone).toBeUndefined();
    });

    it('sem telefone e sem documento, phone e cpf ficam ausentes', () => {
      const incoming = swlCustomerIncoming(
        cliente({ celular: null, telefone: null, documento: null }),
      );
      expect(incoming.phone).toBeUndefined();
      expect(incoming.cpf).toBeUndefined();
      expect(Object.keys(incoming)).not.toContain('phone');
      expect(Object.keys(incoming)).not.toContain('cpf');
    });

    it('nome vazio vira Cliente e sexo diferente de M ou F é omitido', () => {
      const incoming = swlCustomerIncoming(cliente({ nome: '  ', sexo: 'X' }));
      expect(incoming.name).toBe('Cliente');
      expect(incoming.gender).toBeUndefined();
      expect(swlCustomerIncoming(cliente({ sexo: 'M' })).gender).toBe('M');
    });

    it('omite o endereço quando vazio', () => {
      expect(
        swlCustomerIncoming(cliente({ endereco: null })).address,
      ).toBeUndefined();
    });
  });
});
