import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MCP_SERVER_REPOSITORY,
  McpServerData,
  UpdateMcpServerInput,
} from '../ports/mcp-server.repository.port';
import type { McpServerRepositoryPort } from '../ports/mcp-server.repository.port';

@Injectable()
export class UpdateMcpServerUseCase {
  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly repository: McpServerRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateMcpServerInput): Promise<McpServerData> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException(`Servidor MCP ${id} não encontrado.`);
    return this.repository.update(id, input);
  }
}
