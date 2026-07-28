import { Module } from '@nestjs/common';
import { PrismaMcpServerRepository } from '../../infrastructure/persistence/repositories/prisma-mcp-server.repository';
import { MCP_SERVER_REPOSITORY } from '../../application/mcp/ports/mcp-server.repository.port';
import { CreateMcpServerUseCase } from '../../application/mcp/use-cases/create-mcp-server.use-case';
import { ListMcpServersUseCase } from '../../application/mcp/use-cases/list-mcp-servers.use-case';
import { FindMcpServerByIdUseCase } from '../../application/mcp/use-cases/find-mcp-server-by-id.use-case';
import { UpdateMcpServerUseCase } from '../../application/mcp/use-cases/update-mcp-server.use-case';
import { ToggleMcpServerUseCase } from '../../application/mcp/use-cases/toggle-mcp-server.use-case';
import { DeleteMcpServerUseCase } from '../../application/mcp/use-cases/delete-mcp-server.use-case';
import { McpServerController } from '../../infrastructure/http/mcp/mcp-server.controller';

@Module({
  controllers: [McpServerController],
  providers: [
    PrismaMcpServerRepository,
    { provide: MCP_SERVER_REPOSITORY, useExisting: PrismaMcpServerRepository },

    CreateMcpServerUseCase,
    ListMcpServersUseCase,
    FindMcpServerByIdUseCase,
    UpdateMcpServerUseCase,
    ToggleMcpServerUseCase,
    DeleteMcpServerUseCase,
  ],
  exports: [MCP_SERVER_REPOSITORY],
})
export class McpModule {}
