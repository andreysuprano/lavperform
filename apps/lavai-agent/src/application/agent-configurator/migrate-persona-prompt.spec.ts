import { readFileSync } from 'fs';
import { join } from 'path';
import type { PromptDocument } from './fill-whatsapp-prompt';
import {
  PRESERVED_TITLE,
  documentFromBackup,
  migratePersonaPrompt,
  missingAgentIds,
  standardConductFromTemplate,
} from './migrate-persona-prompt';

const standard: PromptDocument = {
  contextPrompt: 'ignorado',
  systemPrompt: 'FOCO NOVO',
  behaviorGuidelines: 'REGRA NOVA',
  guardrails: 'LIMITE NOVO',
};

describe('migratePersonaPrompt', () => {
  it('grava a conduta nova e guarda o prompt antigo no contexto', () => {
    const next = migratePersonaPrompt(
      {
        contextPrompt: 'LOJA',
        systemPrompt: 'FOCO',
        behaviorGuidelines: 'REGRA',
        guardrails: '',
      },
      standard,
    );

    expect(next.systemPrompt).toBe('FOCO NOVO');
    expect(next.behaviorGuidelines).toBe('REGRA NOVA');
    expect(next.guardrails).toBe('LIMITE NOVO');
    expect(next.contextPrompt.startsWith('LOJA\n\n' + PRESERVED_TITLE)).toBe(true);
    expect(next.contextPrompt).toContain('### Foco que estava salvo\n\nFOCO');
    expect(next.contextPrompt).toContain('### Diretrizes que estavam salvas\n\nREGRA');
    expect(next.contextPrompt).not.toContain('### Guardrails que estavam salvos');
    expect(next.contextPrompt).not.toContain('ignorado');
  });

  it('não duplica o bloco quando o título já existe', () => {
    const once = migratePersonaPrompt(
      {
        contextPrompt: 'LOJA',
        systemPrompt: 'FOCO',
        behaviorGuidelines: 'REGRA',
        guardrails: 'LIMITE',
      },
      standard,
    );
    const twice = migratePersonaPrompt(once, standard);
    expect(twice.contextPrompt).toBe(once.contextPrompt);
    expect(twice.contextPrompt.split(PRESERVED_TITLE)).toHaveLength(2);
  });

  it('começa no título quando o contexto anterior está vazio', () => {
    const next = migratePersonaPrompt(
      { contextPrompt: '  ', systemPrompt: 'FOCO', behaviorGuidelines: '', guardrails: '' },
      standard,
    );
    expect(next.contextPrompt.startsWith(PRESERVED_TITLE)).toBe(true);
  });
});

describe('standardConductFromTemplate', () => {
  it('lê os três campos de conduta do arquivo padrão', () => {
    const template = readFileSync(join(__dirname, 'prompts/whatsapp-agent.prompt.md'), 'utf8');
    const conduct = standardConductFromTemplate(template);
    expect(conduct.systemPrompt).toContain('atendente virtual');
    expect(conduct.behaviorGuidelines).toContain('Urgência');
    expect(conduct.guardrails).toContain('Nunca invente');
    expect(conduct.contextPrompt).toBe('');
  });

  it('recusa template sem os quatro títulos', () => {
    expect(() => standardConductFromTemplate('# systemPrompt\n\nx')).toThrow('Prompt padrão inválido');
  });
});

describe('backup', () => {
  it('devolve os quatro campos originais', () => {
    expect(
      documentFromBackup({
        agentId: 'a',
        companyName: 'Loja',
        agentName: 'Bia',
        systemPrompt: 's',
        behaviorGuidelines: 'b',
        guardrails: 'g',
        contextPrompt: 'c',
      }),
    ).toEqual({
      systemPrompt: 's',
      behaviorGuidelines: 'b',
      guardrails: 'g',
      contextPrompt: 'c',
    });
  });

  it('lista o agente que não existe mais', () => {
    expect(missingAgentIds(['a', 'b'], ['a'])).toEqual(['b']);
    expect(missingAgentIds(['a'], ['a'])).toEqual([]);
  });
});
