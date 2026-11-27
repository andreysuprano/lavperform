import {
  extractPriceFactLines,
  isConfiguratorQuestion,
  tryDirectContextInstruction,
} from './direct-context-instruction';

describe('isConfiguratorQuestion', () => {
  it('trata pergunta sem instrução', () => {
    expect(isConfiguratorQuestion('Qual é a saudação?')).toBe(true);
  });

  it('não trata "deve ser" como pergunta', () => {
    expect(isConfiguratorQuestion('A saudação de abertura deve ser: Olá')).toBe(false);
  });
});

describe('tryDirectContextInstruction', () => {
  it('extrai saudação de abertura', () => {
    const result = tryDirectContextInstruction(
      'A saudação de abertura deve ser: Olá Qualito!',
      'contexto vazio',
    );
    expect(result?.writesContext).toBe(true);
    expect(result?.addition).toContain('Qualito');
  });

  it('não grava de novo quando o texto já está no contexto', () => {
    const result = tryDirectContextInstruction(
      'A saudação de abertura deve ser: Olá Qualito!',
      'Olá Qualito! já aqui',
    );
    expect(result?.writesContext).toBe(false);
  });

  it('grava preços informados em texto livre (cobertor)', () => {
    const text =
      'valor para lavar cobertor de casal o valor para lavar é de R$ 50,00. qual valor do cobertor solteiro? o valor é de R$ 40,00';
    expect(extractPriceFactLines(text)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/cobertor de casal/i),
        expect.stringMatching(/cobertor solteiro/i),
      ]),
    );
    const result = tryDirectContextInstruction(text, '');
    expect(result?.writesContext).toBe(true);
    expect(result?.addition).toContain('R$ 40,00');
  });
});