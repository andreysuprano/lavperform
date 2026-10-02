import {
  BadRequestException,
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
  Query,
} from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgentKind } from '../../../application/agent/ports/agent.repository.port';
import type {
  AgentData,
  AgentMemoryConfigData,
  AgentModelConfigData,
  AgentPersonaData,
  AgentWithConfigsData,
} from '../../../application/agent/ports/agent.repository.port';
import { assertAgentKind } from '../../../application/agent/assert-agent-kind';
import { DeleteAgentUseCase } from '../../../application/agent/use-cases/delete-agent.use-case';
import { FindAgentByIdUseCase } from '../../../application/agent/use-cases/find-agent-by-id.use-case';
import { ToggleAgentActiveUseCase } from '../../../application/agent/use-cases/toggle-agent-active.use-case';
import { UpdateAgentMemoryConfigUseCase } from '../../../application/agent/use-cases/update-agent-memory-config.use-case';
import { UpdateAgentModelConfigUseCase } from '../../../application/agent/use-cases/update-agent-model-config.use-case';
import { UpdateAgentPersonaUseCase } from '../../../application/agent/use-cases/update-agent-persona.use-case';
import { UpdateAgentUseCase } from '../../../application/agent/use-cases/update-agent.use-case';
import { UpdateAgentDto } from '../../../application/agent/dtos/update-agent.dto';
import { UpdateAgentMemoryConfigDto } from '../../../application/agent/dtos/update-agent-memory-config.dto';
import { UpdateAgentModelConfigDto } from '../../../application/agent/dtos/update-agent-model-config.dto';
import { UpdateAgentPersonaDto } from '../../../application/agent/dtos/update-agent-persona.dto';
import { CreatePlatformAgentUseCase } from '../../../application/platform-agent/use-cases/create-platform-agent.use-case';
import { ListPlatformAgentsUseCase } from '../../../application/platform-agent/use-cases/list-platform-agents.use-case';
import { ListPlatformTurnsUseCase } from '../../../application/platform-agent/use-cases/list-platform-turns.use-case';
import { RunPlatformTurnUseCase } from '../../../application/platform-agent/use-cases/run-platform-turn.use-case';
import {
  CreatePlatformAgentDto,
  ListPlatformTurnsQueryDto,
  RunPlatformTurnDto,
} from './platform-agent.dto';

@ApiTags('platform-agents')
@Controller('platform-agents')
export class PlatformAgentController {
  constructor(
    private readonly createPlatformAgent: CreatePlatformAgentUseCase,
    private readonly listPlatformAgents: ListPlatformAgentsUseCase,
    private readonly findAgentById: FindAgentByIdUseCase,
    private readonly updateAgent: UpdateAgentUseCase,
    private readonly updateAgentPersona: UpdateAgentPersonaUseCase,
    private readonly updateAgentModelConfig: UpdateAgentModelConfigUseCase,
    private readonly updateAgentMemoryConfig: UpdateAgentMemoryConfigUseCase,
    private readonly toggleAgentActive: ToggleAgentActiveUseCase,
    private readonly deleteAgent: DeleteAgentUseCase,
    private readonly runPlatformTurn: RunPlatformTurnUseCase,
    private readonly listPlatformTurns: ListPlatformTurnsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar agente da plataforma Lavperform' })
  create(@Body() dto: CreatePlatformAgentDto): Promise<AgentWithConfigsData> {
    return this.createPlatformAgent.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agentes da plataforma, ativos e inativos' })
  findAll(): Promise<AgentWithConfigsData[]> {
    return this.listPlatformAgents.execute();
  }

  @Get(':id/turns')
  @ApiOperation({ summary: 'Histórico do trio agente, empresa e usuário' })
  @ApiNotFoundResponse()
  listTurns(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListPlatformTurnsQueryDto,
  ) {
    return this.listPlatformTurns.execute(id, {
      contextCompanyId: query.contextCompanyId,
      platformUserId: query.platformUserId,
      limit: query.limit ?? 50,
    });
  }

  @Post(':id/turns')
  @ApiOperation({ summary: 'Enviar uma mensagem ao agente da plataforma' })
  @ApiNotFoundResponse()
  turn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RunPlatformTurnDto) {
    return this.runPlatformTurn.execute(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar agente da plataforma com as configurações' })
  @ApiNotFoundResponse()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AgentWithConfigsData> {
    return this.requireInternal(id);
  }

  @Patch(':id')
  @ApiNotFoundResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ): Promise<AgentData> {
    if (dto.instanceName) {
      throw new BadRequestException('Agente de plataforma não aceita instanceName');
    }
    await this.requireInternal(id);
    return this.updateAgent.execute(id, dto);
  }

  @Patch(':id/persona')
  @ApiNotFoundResponse()
  async updatePersona(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentPersonaDto,
  ): Promise<AgentPersonaData> {
    await this.requireInternal(id);
    return this.updateAgentPersona.execute(id, dto);
  }

  @Patch(':id/model-config')
  @ApiNotFoundResponse()
  async updateModelConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentModelConfigDto,
  ): Promise<AgentModelConfigData> {
    await this.requireInternal(id);
    return this.updateAgentModelConfig.execute(id, dto);
  }

  @Patch(':id/memory-config')
  @ApiNotFoundResponse()
  async updateMemoryConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentMemoryConfigDto,
  ): Promise<AgentMemoryConfigData> {
    await this.requireInternal(id);
    return this.updateAgentMemoryConfig.execute(id, dto);
  }

  @Patch(':id/toggle')
  @ApiNotFoundResponse()
  async toggle(@Param('id', ParseUUIDPipe) id: string): Promise<AgentData> {
    await this.requireInternal(id);
    return this.toggleAgentActive.execute(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.requireInternal(id);
    await this.deleteAgent.execute(id);
  }

  private async requireInternal(id: string): Promise<AgentWithConfigsData> {
    const agent = await this.findAgentById.execute(id);
    assertAgentKind(agent, AgentKind.INTERNAL);
    return agent;
  }
}
