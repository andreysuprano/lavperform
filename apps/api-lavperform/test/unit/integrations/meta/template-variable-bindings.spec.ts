import {
  areMetaBindingsInSync,
  rehydrateMetaComponents,
  resolveMetaExamples,
  translateMetaCustomerTexts,
  TemplateVariableBindingError,
} from 'src/integrations/meta/application/template-variable-bindings';

describe('template variable bindings', () => {
  it('traduz as chaves da lavanderia para índices e preenche o exemplo conhecido', () => {
    const translated = translateMetaCustomerTexts({
      bodyText:
        'Olá {{primeiro_nome}}, faz {{dias_sem_venda}} dias. Passe na {{nome_loja}}.',
    });

    expect(translated.bodyText).toBe(
      'Olá {{1}}, faz {{2}} dias. Passe na {{3}}.',
    );
    expect(translated.bindings?.bindings).toEqual([
      { index: 1, key: 'primeiro_nome' },
      { index: 2, key: 'dias_sem_venda' },
      { index: 3, key: 'nome_loja' },
    ]);

    expect(
      resolveMetaExamples({
        bindings: translated.bindings,
        bodyExamples: [],
      }).bodyExamples,
    ).toEqual(['Maria', '15', 'Minha Loja']);
  });

  it('exige exemplo para chave livre', () => {
    const translated = translateMetaCustomerTexts({
      bodyText: 'Seu código é {{codigo_cliente}}',
    });

    expect(() =>
      resolveMetaExamples({
        bindings: translated.bindings,
        bodyExamples: ['   '],
      }),
    ).toThrow(TemplateVariableBindingError);
  });

  it('recusa chave fora do formato', () => {
    expect(() =>
      translateMetaCustomerTexts({ bodyText: 'Olá {{1Nome}}' }),
    ).toThrow('Use uma sugestão ou um nome no formato {{chave}}.');
  });

  it('template antigo sem vínculo não reidrata o texto', () => {
    const components = [{ type: 'BODY', text: 'Olá {{1}}' }];
    const result = rehydrateMetaComponents(components, null);
    expect(result.variableBindingsApplicable).toBe(false);
    expect(result.components).toBe(components);
    expect(areMetaBindingsInSync(null, components)).toBe(false);
  });

  it('reidrata o nome quando o vínculo bate com o texto posicional', () => {
    const components = [{ type: 'BODY', text: 'Olá {{1}}' }];
    const stored = {
      bindings: [{ index: 1, key: 'primeiro_nome' }],
      metaSlots: { header: [], body: [1] },
    };
    const result = rehydrateMetaComponents(components, stored);
    expect(result.variableBindingsApplicable).toBe(true);
    expect(result.components).toEqual([
      { type: 'BODY', text: 'Olá {{primeiro_nome}}' },
    ]);
  });
});
