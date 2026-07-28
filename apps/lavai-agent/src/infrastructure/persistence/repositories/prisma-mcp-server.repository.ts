import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  McpServerRepositoryPort,
  McpServerData,
  CreateMcpServerInput,
  UpdateMcpServerInput,
} from '../../../application/mcp/ports/mcp-server.repository.port';
import { McpTransport } from '../../../application/mcp/ports/mcp-server.repository.port';

@Injectable()
export class PrismaMcpServerRepository implements McpServerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMcpServerInput): Promise<McpServerData> {
    const record = await this.prisma.agentMcpServer.create({
      data: {
        agentId: input.agentId,
        name: input.name,
        transport: input.transport,
        enabled: input.enabled ?? true,
        command: input.command ?? null,
        args: input.args ?? [],
        env: (input.env ?? {}) as object,
        url: input.url ?? null,
        headers: (input.headers ?? {}) as object,
      },
    });
    return this.toData(record);
  }

  async findById(id: string): Promise<McpServerData | null> {
    const record = await this.prisma.agentMcpServer.findUnique({ where: { id } });
    return record ? this.toData(record) : null;
  }

  async findAllByAgent(agentId: string): Promise<McpServerData[]> {
    const records = await this.prisma.agentMcpServer.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(this.toData);
  }

  async findEnabledByAgent(agentId: string): Promise<McpServerData[]> {
    const records = await this.prisma.agentMcpServer.findMany({
      where: { agentId, enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    return records.map(this.toData);
  }

  async update(id: string, input: UpdateMcpServerInput): Promise<McpServerData> {
    const record = await this.prisma.agentMcpServer.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.transport !== undefined && { transport: input.transport }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
        ...(input.command !== undefined && { command: input.command }),
        ...(input.args !== undefined && { args: input.args }),
        ...(input.env !== undefined && { env: input.env as object }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.headers !== undefined && { headers: input.headers as object }),
      },
    });
    return this.toData(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.agentMcpServer.delete({ where: { id } });
  }

  private toData(record: {
    id: string;
    agentId: string;
    name: string;
    transport: string;
    enabled: boolean;
    command: string | null;
    args: string[];
    env: unknown;
    url: string | null;
    headers: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): McpServerData {
    return {
      id: record.id,
      agentId: record.agentId,
      name: record.name,
      transport: record.transport as McpTransport,
      enabled: record.enabled,
      command: record.command,
      args: record.args,
      env: (record.env ?? {}) as Record<string, string>,
      url: record.url,
      headers: (record.headers ?? {}) as Record<string, string>,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
