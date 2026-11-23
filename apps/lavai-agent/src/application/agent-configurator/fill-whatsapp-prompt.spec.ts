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
    const voice = [document.systemPrompt, document.behaviorGuidelines, document.guardrails].join('\n');
    expect(document.contextPrompt).toContain('busca e entrega');
    expect(document.contextPrompt).not.toContain('passo a passo');
    expect(voice).not.toContain('passo a passo');
    expect(voice).not.toContain('totem');
    expect(voice).toContain('Não use a palavra ciclo.');
    expect(voice.replaceAll('Não use a palavra ciclo.', '')).not.toMatch(/ciclo/i);
    expect(voice).toContain('peça');
    expect(voice).toContain('pacote');
    expect(voice).not.toContain('{{#');
  });

  it('no autoatendimento fala de ciclo e totem e tira o bloco convencional', () => {
    const document = fillWhatsappPrompt(template, 'SELF_SERVICE', answersFor('SELF_SERVICE'));
    const voice = [document.systemPrompt, document.behaviorGuidelines, document.guardrails].join('\n');
    expect(voice).toMatch(/ciclo/i);
    expect(voice).toContain('totem');
    expect(voice).toContain('passo a passo');
    expect(voice).not.toContain('busca e entrega');
    expect(voice).not.toContain('{{#');
    expect(document.contextPrompt).not.toContain('busca e entrega');
  });

  it('remove todos os blocos do outro tipo, não só o primeiro', () => {
    const twoBlocks = [
      '# contextPrompt',
      '{{facts}}',
      '{{#SELF_SERVICE}}passo a passo{{/SELF_SERVICE}}',
      '{{#CONVENTIONAL}}busca e entrega{{/CONVENTIONAL}}',
      '# systemPrompt',
      '{{#SELF_SERVICE}}totem ciclo{{/SELF_SERVICE}}',
      '{{#CONVENTIONAL}}peça pacote. Não use a palavra ciclo.{{/CONVENTIONAL}}',
      '# behaviorGuidelines',
      'ok',
      '# guardrails',
      'ok',
    ].join('\n');
    const document = fillWhatsappPrompt(twoBlocks, 'CONVENTIONAL', answersFor('CONVENTIONAL'));
    expect(document.systemPrompt).not.toContain('totem');
    expect(document.contextPrompt).not.toContain('passo a passo');
    expect(document.systemPrompt).toContain('peça');
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
