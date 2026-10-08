import {
  ConfiguratorReplyError,
  decideProposal,
  finalizeConfiguratorReply,
  parseConfiguratorReply,
  STALE_MESSAGE,
  toClientBlocks,
} from './configurator-blocks';

const document = {
  contextPrompt: 'contexto',
  systemPrompt: 'sistema',
  behaviorGuidelines: 'diretrizes',
  guardrails: 'limites',
};

describe('parseConfiguratorReply', () => {
  it('aceita markdown e guarda a proposta só no objeto interno', () => {
    const blocks = parseConfiguratorReply(
      JSON.stringify({
        blocks: [
          { type: 'markdown', content: 'Vou ajustar o horário.' },
          { type: 'proposal', behavior: 'Passa a informar que abre às 8h.', document },
        ],
      }),
    );
    const client = toClientBlocks('msg-1', 'pending', blocks.map((block) =>
      block.type === 'proposal' ? { ...block, baseUpdatedAt: '2026-10-08T00:00:00.000Z' } : block,
    ));
    expect(client).toEqual([
      { type: 'markdown', content: 'Vou ajustar o horário.' },
      {
        type: 'proposal',
        messageId: 'msg-1',
        behavior: 'Passa a informar que abre às 8h.',
        status: 'pending',
      },
    ]);
    expect(JSON.stringify(client)).not.toContain('contexto');
  });

  it('rejeita JSON inválido, proposta incompleta e mais de uma proposta', () => {
    expect(() => parseConfiguratorReply('não json')).toThrow(ConfiguratorReplyError);
    expect(() =>
      parseConfiguratorReply(
        JSON.stringify({
          blocks: [{ type: 'markdown', content: 'ok' }, { type: 'proposal', behavior: 'x', document: { contextPrompt: 'a' } }],
        }),
      ),
    ).toThrow(ConfiguratorReplyError);
    expect(() =>
      parseConfiguratorReply(
        JSON.stringify({
          blocks: [
            { type: 'markdown', content: 'ok' },
            { type: 'proposal', behavior: 'um', document },
            { type: 'proposal', behavior: 'dois', document },
          ],
        }),
      ),
    ).toThrow(ConfiguratorReplyError);
  });
});

describe('finalizeConfiguratorReply', () => {
  const proposal = { behavior: 'Passa a avisar o horário.', document };

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
      },
    ]);
    expect(JSON.stringify(client)).not.toContain('contexto');
  });

  it('aceita markdown puro e rejeita resposta vazia', () => {
    expect(finalizeConfiguratorReply('Só uma resposta.', null, 't1')).toEqual([
      { type: 'markdown', content: 'Só uma resposta.' },
    ]);
    expect(() => finalizeConfiguratorReply('   ', null, 't1')).toThrow('O modelo devolveu uma resposta vazia.');
  });

  it('não descarta a proposta quando o modelo devolve JSON inválido', () => {
    const blocks = finalizeConfiguratorReply('{"contextPrompt":"segredo"}', proposal, 't1');
    expect(blocks.map((block) => block.type)).toEqual(['markdown', 'proposal']);
    expect(JSON.stringify(toClientBlocks('msg-1', 'pending', blocks))).not.toContain('segredo');
  });

  it('explica quando o JSON não serve e não há proposta', () => {
    expect(() => finalizeConfiguratorReply('{"blocks":[]}', null, 't1')).toThrow(
      'O modelo devolveu um formato inválido.',
    );
  });
});

describe('decideProposal', () => {
  const base = {
    status: 'pending' as const,
    baseUpdatedAt: 't1',
    currentUpdatedAt: 't1',
    document,
  };

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
