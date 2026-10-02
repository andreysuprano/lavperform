import {
  extractVmLavSalesList,
  filterVmLavSalesByCnpj,
  normalizeVmLavCnpj,
  resolveVmLavCnpj,
} from 'src/integrations/vmlav/api/vmlav-sales-response.util';
import { VmLavSale } from 'src/integrations/vmlav/api/vmlav.types';

describe('vmlav-sales-response.util', () => {
  it('normaliza CNPJ removendo pontuação', () => {
    expect(normalizeVmLavCnpj('12.345.678/0001-90')).toBe('12345678000190');
  });

  it('aceita lista de vendas no formato direto', () => {
    const sales = extractVmLavSalesList([{ idVenda: 1 }, { idVenda: 2 }]);
    expect(sales).toHaveLength(2);
  });

  it('desembrulha resposta paginada da API', () => {
    const sales = extractVmLavSalesList({
      content: [{ idVenda: 7 }],
      totalElements: 1,
    });
    expect(sales).toEqual([{ idVenda: 7 }]);
  });

  it('falha com mensagem clara quando o payload não é uma lista', () => {
    expect(() => extractVmLavSalesList({ total: 0 })).toThrow(
      /Resposta inesperada da API VM Lav/,
    );
  });

  it('usa o CNPJ da integração quando ele tem 14 dígitos', () => {
    expect(resolveVmLavCnpj('11.111.111/0001-11', '22.222.222/0001-22')).toEqual({
      cnpj: '11111111000111',
      source: 'integration',
    });
  });

  it('ignora filtro que não é CNPJ e usa o CNPJ da empresa', () => {
    expect(resolveVmLavCnpj('LOJA-01', '22.222.222/0001-22')).toEqual({
      cnpj: '22222222000122',
      source: 'company',
    });
  });

  it('mantém apenas vendas do CNPJ escolhido', () => {
    const sales = [
      { documentoEmpresa: { identificador: '11.111.111/0001-11' } },
      { documentoEmpresa: { identificador: '22222222000122' } },
      { documentoEmpresa: { identificador: '' } },
    ] as VmLavSale[];

    expect(filterVmLavSalesByCnpj(sales, '11111111000111')).toEqual([sales[0]]);
  });
});
