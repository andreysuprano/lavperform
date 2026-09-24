import { parseGeneratedDocument, parseProposal } from './parse-model-json';

describe('parseGeneratedDocument', () => {
  const document = {
    contextPrompt: 'Lavanderia',
    systemPrompt: 'Atender no WhatsApp',
    behaviorGuidelines: 'Confirme o prazo',
    guardrails: 'Não invente preço',
  };

  it('aceita JSON com cerca e de 4 a 6 perguntas', () => {
    const raw = '```json\n' + JSON.stringify({
      ...document,
      suggestedQuestions: ['Qual o horário?', 'Qual o preço?', 'Qual o prazo?', 'Vocês buscam?'],
    }) + '\n```';
    const parsed = parseGeneratedDocument(raw);
    expect(parsed?.suggestedQuestions).toHaveLength(4);
    expect(parsed?.document.systemPrompt).toBe('Atender no WhatsApp');
  });

  it('recusa menos de 4 perguntas ou campo vazio', () => {
    expect(parseGeneratedDocument(JSON.stringify({
      ...document,
      suggestedQuestions: ['a', 'b', 'c'],
    }))).toBeNull();
    expect(parseGeneratedDocument(JSON.stringify({
      ...document,
      systemPrompt: '  ',
      suggestedQuestions: ['a', 'b', 'c', 'd'],
    }))).toBeNull();
  });
});

describe('parseProposal', () => {
  it('aceita só partes conhecidas e não vazias', () => {
    const parsed = parseProposal(JSON.stringify({
      summary: 'Tira o preço inventado',
      changes: { guardrails: 'Não informe preço' },
      baseUpdatedAt: '2026-09-24T00:00:00.000Z',
    }));
    expect(parsed?.changes.guardrails).toBe('Não informe preço');
  });

  it('recusa campo fora dos quatro, texto vazio ou changes vazias', () => {
    expect(parseProposal(JSON.stringify({
      summary: 'x',
      changes: { welcomeMessage: 'oi' },
    }))).toBeNull();
    expect(parseProposal(JSON.stringify({
      summary: 'x',
      changes: { guardrails: '  ' },
    }))).toBeNull();
    expect(parseProposal(JSON.stringify({ summary: 'x', changes: {} }))).toBeNull();
  });
});
