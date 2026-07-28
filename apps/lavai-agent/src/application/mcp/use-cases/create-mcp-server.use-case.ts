import { Inject, Injectable } from '@nestjs/common';
import {
  MCP_SERVER_REPOSITORY,
  McpServerData,
  CreateMcpServerInput,
} from '../ports/mcp-server.repository.port';
import type { McpServerRepositoryPort } from '../ports/mcp-server.repository.port';

@Injectable()
export class CreateMcpServerUseCase {
  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly repository: McpServerRepositoryPort,
  ) {}

  execute(input: CreateMcpServerInput): Promise<McpServerData> {
    return this.repository.create(input);
  }
}
