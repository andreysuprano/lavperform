import { NotFoundException } from '@nestjs/common';
import { AgentKind } from './ports/agent.repository.port';
import { assertAgentKind } from './assert-agent-kind';

describe('assertAgentKind', () => {
  it('recusa agente interno nas rotas do agente público', () => {
    expect(() =>
      assertAgentKind({ kind: AgentKind.INTERNAL } as never, AgentKind.PUBLIC),
    ).toThrow(NotFoundException);
  });

  it('aceita o tipo pedido', () => {
    expect(() =>
      assertAgentKind({ kind: AgentKind.PUBLIC } as never, AgentKind.PUBLIC),
    ).not.toThrow();
  });
});
