import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateMcpServerDto } from '../../../application/mcp/dtos/create-mcp-server.dto';
import { UpdateMcpServerDto } from '../../../application/mcp/dtos/update-mcp-server.dto';
import type { McpServerData } from '../../../application/mcp/ports/mcp-server.repository.port';
import { CreateMcpServerUseCase } from '../../../application/mcp/use-cases/create-mcp-server.use-case';
import { ListMcpServersUseCase } from '../../../application/mcp/use-cases/list-mcp-servers.use-case';
import { FindMcpServerByIdUseCase } from '../../../application/mcp/use-cases/find-mcp-server-by-id.use-case';
import { UpdateMcpServerUseCase } from '../../../application/mcp/use-cases/update-mcp-server.use-case';
import { ToggleMcpServerUseCase } from '../../../application/mcp/use-cases/toggle-mcp-server.use-case';
import { DeleteMcpServerUseCase } from '../../../application/mcp/use-cases/delete-mcp-server.use-case';

@ApiTags('mcp-servers')
@Controller()
export class McpServerController {
  constructor(
    private readonly createMcpServer: CreateMcpServerUseCase,
    private readonly listMcpServers: ListMcpServersUseCase,
    private readonly findMcpServerById: FindMcpServerByIdUseCase,
    private readonly updateMcpServer: UpdateMcpServerUseCase,
    private readonly toggleMcpServer: ToggleMcpServerUseCase,
    private readonly deleteMcpServer: DeleteMcpServerUseCase,
  ) {}

  // ─── Agente → Servidores MCP ──────────────────────────────────────────────

  @Post('agents/:agentId/mcp-servers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar servidor MCP a um agente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  create(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: CreateMcpServerDto,
  ): Promise<McpServerData> {
    return this.createMcpServer.execute({ ...dto, agentId });
  }

  @Get('agents/:agentId/mcp-servers')
  @ApiOperation({ summary: 'Listar servidores MCP de um agente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  findAll(
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ): Promise<McpServerData[]> {
    return this.listMcpServers.execute(agentId);
  }

  // ─── Servidor MCP individual ──────────────────────────────────────────────

  @Get('mcp-servers/:id')
  @ApiOperation({ summary: 'Buscar servidor MCP por ID' })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<McpServerData> {
    return this.findMcpServerById.execute(id);
  }

  @Patch('mcp-servers/:id')
  @ApiOperation({ summary: 'Atualizar configuração do servidor MCP' })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMcpServerDto,
  ): Promise<McpServerData> {
    return this.updateMcpServer.execute(id, dto);
  }

  @Patch('mcp-servers/:id/toggle')
  @ApiOperation({
    summary: 'Habilitar / desabilitar servidor MCP',
    description: 'Inverte o estado `enabled`. Servidor desabilitado não é conectado durante as execuções do agente.',
  })
  @ApiNotFoundResponse()
  toggle(@Param('id', ParseUUIDPipe) id: string): Promise<McpServerData> {
    return this.toggleMcpServer.execute(id);
  }

  @Delete('mcp-servers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover servidor MCP' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteMcpServer.execute(id);
  }
}
