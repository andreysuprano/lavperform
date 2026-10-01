import { NotFoundException } from '@nestjs/common';
import { AgentKind } from './ports/agent.repository.port';
import type { AgentWithConfigsData } from './ports/agent.repository.port';

export function assertAgentKind(
  agent: AgentWithConfigsData | null,
  kind: AgentKind,
): asserts agent is AgentWithConfigsData {
  if (!agent || agent.kind !== kind) {
    throw new NotFoundException('Agente não encontrado.');
  }
}
