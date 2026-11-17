import {
  EssenceRateLimitError,
  isEssenceRateLimitBody,
  parseEssenceSelectRows,
} from '../../../../src/integrations/hybex-essence/api/essence-select.util';

describe('essence-select.util', () => {
  it('detecta corpo de rate limit da API Essence', () => {
    expect(isEssenceRateLimitBody('Limite de 20 chamadas por minuto. ')).toBe(true);
    expect(isEssenceRateLimitBody([])).toBe(false);
  });

  it('lança EssenceRateLimitError em vez de retornar lista vazia', () => {
    expect(() =>
      parseEssenceSelectRows('Limite de 20 chamadas por minuto. '),
    ).toThrow(EssenceRateLimitError);
  });

  it('retorna arrays normalmente', () => {
    expect(parseEssenceSelectRows([{ Sequencia: 1 }])).toEqual([{ Sequencia: 1 }]);
  });
});