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
  const edits = { replacements: [{ before: 'a', after: 'b' }], addition: '' };

  it('aceita resumo com edições pontuais do contexto', () => {
    const parsed = parseProposal(JSON.stringify({
      summary: 'Troca o preço',
      ...edits,
      answerKey: 'pricing',
      answerValue: 'R$ 25',
    }));
    expect(parsed).toEqual({ summary: 'Troca o preço', ...edits, answerKey: 'pricing', answerValue: 'R$ 25' });
  });

  it('recusa reescrita de campos, edição malformada e resposta sem resumo', () => {
    expect(parseProposal(JSON.stringify({ summary: 'x', changes: { guardrails: 'outro' } }))).toBeNull();
    expect(parseProposal(JSON.stringify({ summary: 'x', replacements: [{ before: 'a' }], addition: '' }))).toBeNull();
    expect(parseProposal(JSON.stringify({ ...edits }))).toBeNull();
    expect(parseProposal('não json')).toBeNull();
  });
});
