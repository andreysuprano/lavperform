import {
  excludePlaygroundChats,
  isPlaygroundSessionId,
  PLAYGROUND_CHAT_PREFIX,
} from './playground-conversation';

describe('playground conversation', () => {
  it('esconde conversas de teste na lista de clientes', () => {
    expect(excludePlaygroundChats({ agentId: 'agent-1' })).toEqual({
      agentId: 'agent-1',
      NOT: { chatId: { startsWith: PLAYGROUND_CHAT_PREFIX } },
    });
  });

  it('aceita o sessionId gerado no navegador', () => {
    expect(isPlaygroundSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isPlaygroundSessionId('visita')).toBe(false);
  });
});
