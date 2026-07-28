import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MCP_SERVER_REPOSITORY,
  McpServerData,
} from '../ports/mcp-server.repository.port';
import type { McpServerRepositoryPort } from '../ports/mcp-server.repository.port';

@Injectable()
export class FindMcpServerByIdUseCase {
  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly repository: McpServerRepositoryPort,
  ) {}

  async execute(id: string): Promise<McpServerData> {
    const server = await this.repository.findById(id);
    if (!server) throw new NotFoundException(`Servidor MCP ${id} não encontrado.`);
    return server;
  }
}
