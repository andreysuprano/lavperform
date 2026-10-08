import {
  ConfiguratorReplyError,
  decideProposal,
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
