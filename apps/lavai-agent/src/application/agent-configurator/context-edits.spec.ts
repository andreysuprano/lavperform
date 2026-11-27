import { applyContextEdits, INSTRUCTIONS_TITLE } from './context-edits';

const context = ['Fatos da loja.', '- Horário: 8h às 18h', '- Preço: R$ 20'].join('\n');

function applied(result: ReturnType<typeof applyContextEdits>) {
  if (!result.ok) throw new Error(result.reason);
  return result;
}

describe('applyContextEdits', () => {
  it('acrescenta a instrução numa seção própria e mantém todo o resto', () => {
    const result = applied(applyContextEdits(context, { replacements: [], addition: '- Peça o nome antes de tudo.' }));
    expect(result.context).toBe(`${context}\n\n${INSTRUCTIONS_TITLE}\n\n- Peça o nome antes de tudo.`);
    expect(result.changes).toEqual([{ before: '', after: '- Peça o nome antes de tudo.' }]);
  });

  it('junta na seção que já existe sem repetir o título', () => {
    const first = applied(applyContextEdits(context, { replacements: [], addition: '- Um.' }));
    const second = applied(applyContextEdits(first.context, { replacements: [], addition: '- Dois.' }));
    expect(second.context).toBe(`${context}\n\n${INSTRUCTIONS_TITLE}\n\n- Um.\n- Dois.`);
  });

  it('cria a seção antes do bloco antigo preservado', () => {
    const legacy = `${context}\n\n## Informações já cadastradas desta lavanderia\n\ntexto antigo`;
    const result = applied(applyContextEdits(legacy, { replacements: [], addition: '- Novo.' }));
    expect(result.context).toBe(
      `${context}\n\n${INSTRUCTIONS_TITLE}\n\n- Novo.\n\n## Informações já cadastradas desta lavanderia\n\ntexto antigo`,
    );
  });

  it('troca só o trecho pedido', () => {
    const result = applied(
      applyContextEdits(context, {
        replacements: [{ before: '- Horário: 8h às 18h', after: '- Horário: 7h às 22h' }],
        addition: '',
      }),
    );
    expect(result.context).toBe(['Fatos da loja.', '- Horário: 7h às 22h', '- Preço: R$ 20'].join('\n'));
  });

  it('grava o texto com cifrão como veio', () => {
    const result = applied(
      applyContextEdits(context, { replacements: [{ before: 'R$ 20', after: "R$ 25 $& $'" }], addition: '' }),
    );
    expect(result.context).toContain("R$ 25 $& $'");
  });

  it('recusa trecho que não existe', () => {
    const result = applyContextEdits(context, { replacements: [{ before: '- Horário: 9h', after: 'x' }], addition: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('não foi encontrado') });
  });

  it('recusa trecho ambíguo', () => {
    const result = applyContextEdits('a\na', { replacements: [{ before: 'a', after: 'b' }], addition: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('mais de uma vez') });
  });

  it('recusa a troca de um bloco grande, para o texto não ser reescrito', () => {
    const long = Array.from({ length: 20 }, (_, index) => `linha ${index}`).join('\n');
    const result = applyContextEdits(long, { replacements: [{ before: long, after: 'resumo' }], addition: '' });
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining('trechos menores') });
  });

  it('recusa quando nada muda', () => {
    expect(applyContextEdits(context, { replacements: [], addition: '  ' }).ok).toBe(false);
    expect(applyContextEdits(context, { replacements: [], addition: '- Preço: R$ 20' }).ok).toBe(false);
  });

  it('não deixa o contexto vazio', () => {
    expect(applyContextEdits('só isso', { replacements: [{ before: 'só isso', after: '' }], addition: '' }).ok).toBe(false);
  });
});
