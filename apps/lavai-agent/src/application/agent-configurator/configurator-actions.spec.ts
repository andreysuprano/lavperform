import { ACTIVITY, activityLabel, agentSnapshot, runConfiguratorTool } from './configurator-actions';

const persona = {
  contextPrompt: 'contexto',
  systemPrompt: 'SEGREDO',
  behaviorGuidelines: 'diretrizes',
  guardrails: 'limites',
};

describe('runConfiguratorTool', () => {
  const snapshot = agentSnapshot(['- Horário: 8h'], persona);

  it('devolve a ficha só para o modelo e nomeia a ação', () => {
    expect(snapshot).toContain('SEGREDO');
    expect(snapshot).toContain('Horário: 8h');
    expect(activityLabel('ler_agente')).toBe(ACTIVITY.readSheet);
    expect(runConfiguratorTool('ler_agente', '{}', snapshot, false)).toEqual({
      content: snapshot,
      proposal: null,
    });
  });

  it('registra uma proposta completa e recusa a segunda', () => {
    const raw = JSON.stringify({
      behavior: 'Passa a avisar o horário.',
      ...persona,
      systemPrompt: 'sistema novo',
    });
    const first = runConfiguratorTool('propor_mudanca', raw, snapshot, false);
    expect(first.proposal?.behavior).toBe('Passa a avisar o horário.');
    expect(first.proposal?.document.systemPrompt).toBe('sistema novo');
    expect(runConfiguratorTool('propor_mudanca', raw, snapshot, true).proposal).toBeNull();
  });

  it('não registra proposta incompleta', () => {
    expect(runConfiguratorTool('propor_mudanca', '{"behavior":"x"}', snapshot, false).proposal).toBeNull();
    expect(runConfiguratorTool('propor_mudanca', 'não json', snapshot, false).proposal).toBeNull();
  });
});
