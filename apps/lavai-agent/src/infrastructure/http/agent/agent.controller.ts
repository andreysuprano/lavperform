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
import { CreateAgentDto } from '../../../application/agent/dtos/create-agent.dto';
import { UpdateAgentDto } from '../../../application/agent/dtos/update-agent.dto';
import { UpdateAgentFilterConfigDto } from '../../../application/agent/dtos/update-agent-filter-config.dto';
import { UpdateAgentJourneyConfigDto } from '../../../application/agent/dtos/update-agent-journey-config.dto';
import { UpdateAgentMediaConfigDto } from '../../../application/agent/dtos/update-agent-media-config.dto';
import { UpdateAgentMemoryConfigDto } from '../../../application/agent/dtos/update-agent-memory-config.dto';
import { UpdateAgentModelConfigDto } from '../../../application/agent/dtos/update-agent-model-config.dto';
import { UpdateAgentNotificationConfigDto } from '../../../application/agent/dtos/update-agent-notification-config.dto';
import { UpdateAgentPersonaDto } from '../../../application/agent/dtos/update-agent-persona.dto';
import type {
  AgentData,
  AgentFilterConfigData,
  AgentJourneyConfigData,
  AgentMediaConfigData,
  AgentMemoryConfigData,
  AgentModelConfigData,
  AgentNotificationConfigData,
  AgentPersonaData,
  AgentWithConfigsData,
} from '../../../application/agent/ports/agent.repository.port';
import { CreateAgentUseCase } from '../../../application/agent/use-cases/create-agent.use-case';
import { DeleteAgentUseCase } from '../../../application/agent/use-cases/delete-agent.use-case';
import { FindAgentByIdUseCase } from '../../../application/agent/use-cases/find-agent-by-id.use-case';
import { ListAgentsByCompanyUseCase } from '../../../application/agent/use-cases/list-agents-by-company.use-case';
import { ToggleAgentActiveUseCase } from '../../../application/agent/use-cases/toggle-agent-active.use-case';
import { UpdateAgentFilterConfigUseCase } from '../../../application/agent/use-cases/update-agent-filter-config.use-case';
import { UpdateAgentJourneyConfigUseCase } from '../../../application/agent/use-cases/update-agent-journey-config.use-case';
import { UpdateAgentMediaConfigUseCase } from '../../../application/agent/use-cases/update-agent-media-config.use-case';
import { UpdateAgentMemoryConfigUseCase } from '../../../application/agent/use-cases/update-agent-memory-config.use-case';
import { UpdateAgentModelConfigUseCase } from '../../../application/agent/use-cases/update-agent-model-config.use-case';
import { UpdateAgentNotificationConfigUseCase } from '../../../application/agent/use-cases/update-agent-notification-config.use-case';
import { UpdateAgentPersonaUseCase } from '../../../application/agent/use-cases/update-agent-persona.use-case';
import { UpdateAgentUseCase } from '../../../application/agent/use-cases/update-agent.use-case';

@ApiTags('agents')
@Controller()
export class AgentController {
  constructor(
    private readonly createAgent: CreateAgentUseCase,
    private readonly listAgentsByCompany: ListAgentsByCompanyUseCase,
    private readonly findAgentById: FindAgentByIdUseCase,
    private readonly updateAgent: UpdateAgentUseCase,
    private readonly toggleAgentActive: ToggleAgentActiveUseCase,
    private readonly updateAgentPersona: UpdateAgentPersonaUseCase,
    private readonly updateAgentModelConfig: UpdateAgentModelConfigUseCase,
    private readonly updateAgentMemoryConfig: UpdateAgentMemoryConfigUseCase,
    private readonly updateAgentMediaConfig: UpdateAgentMediaConfigUseCase,
    private readonly updateAgentFilterConfig: UpdateAgentFilterConfigUseCase,
    private readonly updateAgentJourneyConfig: UpdateAgentJourneyConfigUseCase,
    private readonly updateAgentNotificationConfig: UpdateAgentNotificationConfigUseCase,
    private readonly deleteAgent: DeleteAgentUseCase,
  ) {}

  // ─── Empresa → Agentes ────────────────────────────────────────────────────

  @Post('companies/:companyId/agents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar agente para uma empresa' })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateAgentDto,
  ): Promise<AgentWithConfigsData> {
    return this.createAgent.execute({ ...dto, companyId });
  }

  @Get('companies/:companyId/agents')
  @ApiOperation({ summary: 'Listar agentes de uma empresa' })
  @ApiParam({ name: 'companyId', description: 'UUID da empresa' })
  findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ): Promise<AgentData[]> {
    return this.listAgentsByCompany.execute(companyId);
  }

  // ─── Agente individual ────────────────────────────────────────────────────

  @Get('agents/:id')
  @ApiOperation({ summary: 'Buscar agente com todas as configurações' })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AgentWithConfigsData> {
    return this.findAgentById.execute(id);
  }

  @Patch('agents/:id')
  @ApiOperation({ summary: 'Atualizar dados básicos do agente (nome, descrição, ativo)' })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ): Promise<AgentData> {
    return this.updateAgent.execute(id, dto);
  }

  @Patch('agents/:id/toggle')
  @ApiOperation({
    summary: 'Ativar / desativar agente',
    description: 'Inverte o estado atual de `active`. Se estava `true` passa para `false` e vice-versa.',
  })
  @ApiNotFoundResponse()
  toggle(@Param('id', ParseUUIDPipe) id: string): Promise<AgentData> {
    return this.toggleAgentActive.execute(id);
  }

  @Delete('agents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover agente e todas as suas configurações' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteAgent.execute(id);
  }

  // ─── Configurações do agente ──────────────────────────────────────────────

  @Patch('agents/:id/persona')
  @ApiOperation({
    summary: 'Atualizar personalidade e prompts do agente',
    description: 'Atualiza systemPrompt, tom de voz, estilo de comunicação e guardrails.',
  })
  @ApiNotFoundResponse()
  updatePersona(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentPersonaDto,
  ): Promise<AgentPersonaData> {
    return this.updateAgentPersona.execute(id, dto);
  }

  @Patch('agents/:id/model-config')
  @ApiOperation({
    summary: 'Atualizar parâmetros do modelo LLM',
    description: 'Atualiza provider, model name, temperature, max_tokens, top_p, etc.',
  })
  @ApiNotFoundResponse()
  updateModelConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentModelConfigDto,
  ): Promise<AgentModelConfigData> {
    return this.updateAgentModelConfig.execute(id, dto);
  }

  @Patch('agents/:id/memory-config')
  @ApiOperation({
    summary: 'Atualizar configuração de memória/contexto',
    description: 'Atualiza tipo de memória (BUFFER/SUMMARY/VECTOR), tamanho da janela e memória de longo prazo.',
  })
  @ApiNotFoundResponse()
  updateMemoryConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentMemoryConfigDto,
  ): Promise<AgentMemoryConfigData> {
    return this.updateAgentMemoryConfig.execute(id, dto);
  }

  @Patch('agents/:id/media-config')
  @ApiOperation({
    summary: 'Atualizar configuração de processamento de mídia',
    description: 'Configura como o agente processa áudio (Whisper), imagem (Vision) e vídeo (Vision). Permite habilitar/desabilitar cada tipo e definir os prompts de extração.',
  })
  @ApiNotFoundResponse()
  updateMediaConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentMediaConfigDto,
  ): Promise<AgentMediaConfigData> {
    return this.updateAgentMediaConfig.execute(id, dto);
  }

  @Patch('agents/:id/filter-config')
  @ApiOperation({
    summary: 'Atualizar filtros de recebimento de mensagens',
    description:
      'Define quais mensagens o agente processa: ' +
      'lista de telefones permitidos, grupos permitidos e gatilho textual (trigger words). ' +
      'O gatilho é validado no texto da mensagem, na transcrição do áudio ou na legenda da imagem/vídeo.',
  })
  @ApiNotFoundResponse()
  updateFilterConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentFilterConfigDto,
  ): Promise<AgentFilterConfigData> {
    return this.updateAgentFilterConfig.execute(id, dto);
  }

  @Patch('agents/:id/journey-config')
  @ApiOperation({
    summary: 'Atualizar configuração da jornada do cliente',
    description:
      'Define follow-ups proativos, keywords de escalação humana e webhook de compra.',
  })
  @ApiNotFoundResponse()
  updateJourneyConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentJourneyConfigDto,
  ): Promise<AgentJourneyConfigData> {
    return this.updateAgentJourneyConfig.execute(id, dto);
  }

  @Patch('agents/:id/notification-config')
  @ApiOperation({
    summary: 'Atualizar configuração de notificação ao pedir ajuda',
    description:
      'Define o telefone que recebe alerta WhatsApp quando o cliente solicita atendimento humano.',
  })
  @ApiNotFoundResponse()
  updateNotificationConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentNotificationConfigDto,
  ): Promise<AgentNotificationConfigData> {
    return this.updateAgentNotificationConfig.execute(id, dto);
  }
}
