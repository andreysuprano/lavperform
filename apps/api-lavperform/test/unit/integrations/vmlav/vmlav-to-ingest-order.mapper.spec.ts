import {
  isVmLavSaleReadyForIngestion,
  mapVmLavSaleToIngestOrder,
} from 'src/integrations/vmlav/mappings/vmlav-to-ingest-order.mapper';
import { VmLavSale } from 'src/integrations/vmlav/api/vmlav.types';

function buildSale(overrides: Partial<VmLavSale> = {}): VmLavSale {
  return {
    data: '2026-02-01T10:30:00Z',
    empresa: 'Seld Catanduva',
    documentoEmpresa: { tipo: 'CNPJ', identificador: '12345678000190' },
    idLavanderia: 10,
    idCliente: 0,
    lavanderia: 'Seld Catanduva',
    cpfCliente: '',
    nomeCliente: '',
    telefoneCliente: null,
    emailCliente: '',
    equipamento: 'M1',
    tipoPagamento: 'CARTAO',
    status: 'SUCESSO',
    codErro: '',
    erro: null,
    autorizador: null,
    provedor: 'VM',
    adquirente: 'CIELO',
    voucher: null,
    cupom: null,
    valor: 15,
    valorSemDesconto: 15,
    ciclos: 1,
    tipoCartao: 'DEBITO',
    bandeiraCartao: 'VISA',
    pedido: {
      itens: [
        {
          tipoServico: 'LAVAGEM',
          servico: 'Lavagem',
          maquina: 'M1',
          valor: 15,
          valorSemDesconto: 15,
        },
      ],
    },
    dtaNascimento: '',
    requisicao: '',
    codigoAutorizacaoEmissor: '123',
    nomeCategoriaVoucher: null,
    idVenda: 9001,
    creditoReal: false,
    ...overrides,
  };
}

describe('vmlav-to-ingest-order.mapper', () => {
  it('considera venda self-service sem nome pronta para ingestão', () => {
    expect(isVmLavSaleReadyForIngestion(buildSale({ nomeCliente: '' }))).toBe(
      true,
    );
    expect(isVmLavSaleReadyForIngestion(buildSale({ nomeCliente: '   ' }))).toBe(
      true,
    );
  });

  it('mapeia venda sem nome como cliente genérico para não descartar o pedido', () => {
    const payload = mapVmLavSaleToIngestOrder(
      buildSale({ nomeCliente: '', cpfCliente: '', telefoneCliente: null }),
      'partner-1',
    );

    expect(payload).not.toBeNull();
    expect(payload?.customer?.name).toBe('Cliente');
    expect(payload?.externalOrderId).toBe('9001');
    expect(payload?.total).toBe(15);
  });

  it('rejeita venda sem idVenda', () => {
    const sale = buildSale({ idVenda: undefined as unknown as number });
    delete (sale as { idVenda?: number }).idVenda;

    expect(isVmLavSaleReadyForIngestion(sale)).toBe(false);
    expect(mapVmLavSaleToIngestOrder(sale, 'partner-1')).toBeNull();
  });
});
