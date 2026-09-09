import {
  extractVmLavSalesList,
  normalizeVmLavCnpj,
} from 'src/integrations/vmlav/api/vmlav-sales-response.util';

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
});
