import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MCP_SERVER_REPOSITORY } from '../ports/mcp-server.repository.port';
import type { McpServerRepositoryPort } from '../ports/mcp-server.repository.port';

@Injectable()
export class DeleteMcpServerUseCase {
  constructor(
    @Inject(MCP_SERVER_REPOSITORY)
    private readonly repository: McpServerRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException(`Servidor MCP ${id} não encontrado.`);
    await this.repository.delete(id);
  }
}
