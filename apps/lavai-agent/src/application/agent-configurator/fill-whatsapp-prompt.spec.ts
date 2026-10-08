import { readFileSync } from 'fs';
import { join } from 'path';
import { scriptFor } from '../prompt-studio/sheet-script';
import {
  FillPromptError,
  IncompleteSheetError,
  fillWhatsappPrompt,
} from './fill-whatsapp-prompt';

const template = readFileSync(
  join(__dirname, 'prompts/whatsapp-agent.prompt.md'),
  'utf8',
);

function answersFor(model: 'CONVENTIONAL' | 'SELF_SERVICE'): Record<string, string> {
  return Object.fromEntries(
    scriptFor(model).map((field) => [field.key, `valor-${field.key}`]),
  );
}

describe('fillWhatsappPrompt', () => {
  it('copia cada fato visível no contextPrompt e mantém só o bloco do tipo', () => {
    const answers = answersFor('SELF_SERVICE');
    answers.priceWash = 'Não tem';
    answers.wifi = 'Não se aplica';
    const document = fillWhatsappPrompt(template, 'SELF_SERVICE', answers);

    for (const field of scriptFor('SELF_SERVICE')) {
      const value = answers[field.key];
      expect(document.contextPrompt).toContain(`- ${field.label}: ${value}`);
    }
    expect(document.contextPrompt).toContain('passo a passo');
    expect(document.contextPrompt).not.toContain('busca e entrega');
    expect(document.systemPrompt.trim().length).toBeGreaterThan(0);
    expect(document.behaviorGuidelines.trim().length).toBeGreaterThan(0);
    expect(document.guardrails.trim().length).toBeGreaterThan(0);
  });

  it('no convencional remove o bloco de autoatendimento', () => {
    const document = fillWhatsappPrompt(template, 'CONVENTIONAL', answersFor('CONVENTIONAL'));
    expect(document.contextPrompt).toContain('busca e entrega');
    expect(document.contextPrompt).not.toContain('passo a passo');
  });

  it('falha sem criar texto quando falta título, facts ou bloco de tipo', () => {
    const answers = answersFor('SELF_SERVICE');
    expect(() => fillWhatsappPrompt('# contextPrompt\n\n{{facts}}', 'SELF_SERVICE', answers)).toThrow(
      FillPromptError,
    );
    expect(() =>
      fillWhatsappPrompt(template.replace('{{facts}}', ''), 'SELF_SERVICE', answers),
    ).toThrow(FillPromptError);
    expect(() =>
      fillWhatsappPrompt(template.replace('{{#CONVENTIONAL}}', ''), 'SELF_SERVICE', answers),
    ).toThrow(FillPromptError);
  });

  it('devolve as chaves vazias da ficha', () => {
    try {
      fillWhatsappPrompt(template, 'SELF_SERVICE', { name: 'Lav' });
      throw new Error('deveria falhar');
    } catch (error) {
      expect(error).toBeInstanceOf(IncompleteSheetError);
      expect((error as IncompleteSheetError).missingKeys[0]).toBe('phone');
    }
  });

  it('falha quando um fato não entra no contextPrompt', () => {
    const broken = template
      .replace('{{facts}}', '')
      .replace('# behaviorGuidelines', '{{facts}}\n\n# behaviorGuidelines');
    expect(() => fillWhatsappPrompt(broken, 'SELF_SERVICE', answersFor('SELF_SERVICE'))).toThrow(
      FillPromptError,
    );
  });
});
