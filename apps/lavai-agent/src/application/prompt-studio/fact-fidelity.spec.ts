import { documentKeepsFacts } from './fact-fidelity';
import type { PromptDocument } from './prompt-studio.types';

const document: PromptDocument = {
  contextPrompt: 'Lavagem: R$ 20. Segunda: 08:00 às 18:00.',
  systemPrompt: 'Foco no WhatsApp.',
  behaviorGuidelines: 'Tom cordial.',
  guardrails: 'A unidade não oferece isso.',
};

describe('documentKeepsFacts', () => {
  it('aceita quando preço, horário e regra aparecem iguais', () => {
    expect(documentKeepsFacts(document, [
      { text: 'R$ 20' },
      { text: '08:00 às 18:00' },
      { text: 'A unidade não oferece isso.' },
    ])).toBe(true);
  });

  it('recusa quando um fato foi reescrito', () => {
    expect(documentKeepsFacts(document, [{ text: 'R$ 25' }])).toBe(false);
  });
});
