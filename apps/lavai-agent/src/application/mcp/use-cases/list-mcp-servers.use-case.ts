import { Inject, Injectable } from '@nestjs/common';
import {
  MCP_SERVER_REPOSITORY,
  McpServerData,
} from '../ports/mcp-server.repository.port';
import type { McpServerRepositoryPort } from '../ports/mcp-server.repository.port';

@Injectable()
export class ListMcpServersUseCase {
  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly repository: McpServerRepositoryPort,
  ) {}

  execute(agentId: string): Promise<McpServerData[]> {
    return this.repository.findAllByAgent(agentId);
  }
}
