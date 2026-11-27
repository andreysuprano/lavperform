import { SHEET_FACTS_TITLE, sheetFactLines, withSheetFacts } from './sheet-facts';

describe('withSheetFacts', () => {
  const solteiro = '- Cobertor: solteiro R$ 40,00 por peça';

  it('coloca no topo o fato que ainda não está no contexto', () => {
    const result = withSheetFacts('Cobertor de casal: R$ 50,00.', [solteiro]);

    expect(result.changed).toBe(true);
    expect(result.context.startsWith(SHEET_FACTS_TITLE)).toBe(true);
    expect(result.context).toContain(solteiro);
    expect(result.context).toContain('Cobertor de casal: R$ 50,00.');
  });

  it('não grava de novo um fato que já está escrito', () => {
    const context = `${SHEET_FACTS_TITLE}\n\n${solteiro}`;
    expect(withSheetFacts(context, [solteiro])).toEqual({ context, changed: false });
  });

  it('acrescenta só a linha que falta dentro da seção', () => {
    const casal = '- Cobertor: casal R$ 50,00';
    const context = `${SHEET_FACTS_TITLE}\n\n${casal}\n\n## Outra seção\n\ntexto`;
    const result = withSheetFacts(context, [casal, solteiro]);

    expect(result.changed).toBe(true);
    expect(result.context).toContain(solteiro);
    expect(result.context).toContain('## Outra seção');
    expect(result.context.split(solteiro)).toHaveLength(2);
  });
});

describe('sheetFactLines', () => {
  it('monta a linha do cobertor e ignora resposta vazia', () => {
    const lines = sheetFactLines('CONVENTIONAL', {
      pieceBlanket: 'solteiro R$ 40,00 por peça',
      priceOther: '   ',
    });

    expect(lines).toEqual(['- Cobertor: solteiro R$ 40,00 por peça']);
  });
});
