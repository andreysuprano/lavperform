import { ACTIVITY, activityLabel, agentSnapshot, configuratorTools, runConfiguratorTool } from './configurator-actions';

const persona = {
  contextPrompt: '- Horário: 8h',
  systemPrompt: 'SEGREDO',
  behaviorGuidelines: 'diretrizes',
  guardrails: 'limites',
};

describe('runConfiguratorTool', () => {
  const snapshot = agentSnapshot(['- Horário: 8h'], persona);
  const run = (name: string, raw: string, alreadyProposed = false) =>
    runConfiguratorTool(name, raw, snapshot, persona.contextPrompt, alreadyProposed);

  it('devolve a ficha só para o modelo e nomeia a ação', () => {
    expect(snapshot).toContain('SEGREDO');
    expect(snapshot).toContain('Horário: 8h');
    expect(activityLabel('ler_agente')).toBe(ACTIVITY.readSheet);
    expect(run('ler_agente', '{}')).toEqual({ content: snapshot, proposal: null });
  });

  it('só oferece edição do contexto de negócio', () => {
    const propose = configuratorTools().find((tool) => tool.function.name === 'propor_mudanca');
    const properties = Object.keys((propose?.function.parameters as { properties: object }).properties);
    expect(properties).toEqual(['behavior', 'replacements', 'addition']);
  });

  it('registra a proposta com o contexto editado e recusa a segunda', () => {
    const raw = JSON.stringify({
      behavior: 'Passa a abrir às 7h.',
      replacements: [{ before: '8h', after: '7h' }],
      addition: '',
      systemPrompt: 'tentativa de trocar o foco',
    });
    const first = run('propor_mudanca', raw);
    expect(first.proposal).toEqual({
      behavior: 'Passa a abrir às 7h.',
      document: { contextPrompt: '- Horário: 7h' },
      changes: [{ before: '8h', after: '7h' }],
    });
    expect(first.content).toContain('Nada foi gravado');
    expect(run('propor_mudanca', raw, true).proposal).toBeNull();
  });

  it('devolve o motivo ao modelo quando a edição não se aplica', () => {
    const result = run(
      'propor_mudanca',
      JSON.stringify({ behavior: 'x', replacements: [{ before: '9h', after: '7h' }], addition: '' }),
    );
    expect(result.proposal).toBeNull();
    expect(result.content).toContain('não foi encontrado');
  });

  it('não registra proposta incompleta', () => {
    expect(run('propor_mudanca', '{"behavior":"x"}').proposal).toBeNull();
    expect(run('propor_mudanca', 'não json').proposal).toBeNull();
  });
});
