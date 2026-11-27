import {
  ConfiguratorReplyError,
  decideProposal,
  finalizeConfiguratorReply,
  instructionsWithSummary,
  parseConfiguratorReply,
  STALE_MESSAGE,
  toClientBlocks,
} from './configurator-blocks';

const document = { contextPrompt: 'contexto-completo' };
const changes = [{ before: '', after: 'abre às 8h' }];
const fullDocument = {
  contextPrompt: 'contexto',
  systemPrompt: 'sistema',
  behaviorGuidelines: 'diretrizes',
  guardrails: 'limites',
};

describe('parseConfiguratorReply', () => {
  it('ignora proposta escrita no texto: só a ferramenta propõe mudança', () => {
    const blocks = parseConfiguratorReply(
      JSON.stringify({
        blocks: [
          { type: 'markdown', content: 'Vou ajustar o horário.' },
          { type: 'proposal', behavior: 'Passa a informar que abre às 8h.', document: fullDocument },
        ],
      }),
    );
    expect(blocks).toEqual([{ type: 'markdown', content: 'Vou ajustar o horário.' }]);
  });

  it('rejeita JSON inválido e resposta sem texto', () => {
    expect(() => parseConfiguratorReply('não json')).toThrow(ConfiguratorReplyError);
    expect(() => parseConfiguratorReply('{"blocks":[]}')).toThrow(ConfiguratorReplyError);
  });
});

describe('finalizeConfiguratorReply', () => {
  const proposal = { behavior: 'Passa a avisar o horário.', document, changes };

  it('mostra a ação concluída e esconde o prompt', () => {
    const client = toClientBlocks('msg-1', 'pending', [
      { type: 'activity', label: 'Lendo a ficha e o prompt do agente' },
      ...finalizeConfiguratorReply('O agente passa a avisar o horário.', proposal, '2026-10-08T00:00:00.000Z'),
    ]);
    expect(client).toEqual([
      { type: 'activity', label: 'Lendo a ficha e o prompt do agente' },
      { type: 'markdown', content: 'O agente passa a avisar o horário.' },
      {
        type: 'proposal',
        messageId: 'msg-1',
        behavior: 'Passa a avisar o horário.',
        status: 'pending',
        changes,
      },
    ]);
    expect(JSON.stringify(client)).not.toContain('contexto-completo');
  });

  it('aceita markdown puro e rejeita resposta vazia', () => {
    expect(finalizeConfiguratorReply('Só uma resposta.', null, 't1')).toEqual([
      { type: 'markdown', content: 'Só uma resposta.' },
    ]);
    expect(() => finalizeConfiguratorReply('   ', null, 't1')).toThrow('O modelo devolveu uma resposta vazia.');
  });

  it('não descarta a proposta quando o modelo devolve JSON inválido', () => {
    const blocks = finalizeConfiguratorReply('{"contextPrompt":"segredo"}', proposal, 't1');
    expect(blocks).toEqual([
      { type: 'markdown', content: 'Passa a avisar o horário.' },
      { type: 'proposal', behavior: 'Passa a avisar o horário.', document, changes, baseUpdatedAt: 't1' },
    ]);
    expect(JSON.stringify(toClientBlocks('msg-1', 'pending', blocks))).not.toContain('segredo');
    expect(JSON.stringify(blocks)).not.toContain('Veja o que o agente passa a fazer.');
  });

  it('explica quando o JSON não serve e não há proposta', () => {
    expect(() => finalizeConfiguratorReply('{"blocks":[]}', null, 't1')).toThrow(
      'O modelo devolveu um formato inválido.',
    );
  });
});

describe('instructionsWithSummary', () => {
  it('devolve o documento intacto e não cola o resumo nas diretrizes', () => {
    const summary = 'Encaminhe para https://wa.me/5516999932179.';
    expect(instructionsWithSummary(fullDocument, summary)).toEqual(fullDocument);
  });
});

describe('decideProposal', () => {
  const base = {
    status: 'pending' as const,
    baseUpdatedAt: 't1',
    currentUpdatedAt: 't1',
    document,
    changes,
  };

  it('não grava proposta antiga, feita antes de existir a lista de mudanças', () => {
    expect(decideProposal({ ...base, changes: undefined, action: 'accept' })).toEqual({
      nextStatus: 'rejected',
      writeDocument: false,
      changed: true,
      message: STALE_MESSAGE,
    });
  });

  it('aceitar grava e recusar não grava', () => {
    expect(decideProposal({ ...base, action: 'accept' })).toMatchObject({
      nextStatus: 'accepted',
      writeDocument: true,
    });
    expect(decideProposal({ ...base, action: 'reject' })).toEqual({
      nextStatus: 'rejected',
      writeDocument: false,
      changed: true,
    });
  });

  it('updatedAt divergente não grava e pede para solicitar de novo', () => {
    expect(
      decideProposal({ ...base, action: 'accept', currentUpdatedAt: 't2' }),
    ).toEqual({
      nextStatus: 'rejected',
      writeDocument: false,
      changed: true,
      message: STALE_MESSAGE,
    });
  });

  it('segunda ação não grava de novo', () => {
    expect(
      decideProposal({ ...base, status: 'accepted', action: 'accept' }),
    ).toMatchObject({ writeDocument: false, changed: false });
    expect(
      decideProposal({ ...base, status: 'rejected', action: 'reject' }),
    ).toMatchObject({ writeDocument: false, changed: false });
  });
});
