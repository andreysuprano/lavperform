import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AGENT_RUN_QUERY_PORT } from '../../../application/agent-trace/ports/agent-run-query.port';
import type {
  AgentRunDetail,
  AgentRunQueryPort,
  AgentRunStatus,
  PaginatedAgentRuns,
} from '../../../application/agent-trace/ports/agent-run-query.port';

@ApiTags('Agent Trace')
@Controller('agent-runs')
export class AgentRunController {
  constructor(
    @Inject(AGENT_RUN_QUERY_PORT)
    private readonly agentRunQuery: AgentRunQueryPort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar execuções do agente com filtros e paginação' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['RUNNING', 'COMPLETED', 'FAILED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Lista paginada de execuções' })
  async findMany(
    @Query('agentId') agentId?: string,
    @Query('companyId') companyId?: string,
    @Query('conversationId') conversationId?: string,
    @Query('status') status?: AgentRunStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedAgentRuns> {
    return this.agentRunQuery.findMany({
      agentId,
      companyId,
      conversationId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma execução com todos os steps' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Detalhes da execução incluindo steps' })
  @ApiNotFoundResponse({ description: 'Execução não encontrada' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AgentRunDetail> {
    const run = await this.agentRunQuery.findById(id);
    if (!run) throw new NotFoundException(`AgentRun ${id} não encontrado`);
    return run;
  }
}
