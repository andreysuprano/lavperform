import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AiAgentService } from '../application/ai-agent.service';
import { PromptSheetService } from '../application/prompt-sheet.service';
import { CreateAgentDto } from '../application/dto/create-agent.dto';
import { UpdateAgentBaseDto } from '../application/dto/update-agent-base.dto';
import { UpdatePersonaDto } from '../application/dto/update-persona.dto';
import { UpdateModelConfigDto } from '../application/dto/update-model-config.dto';
import { UpdateMemoryConfigDto } from '../application/dto/update-memory-config.dto';
import { UpdateMediaConfigDto } from '../application/dto/update-media-config.dto';
import { UpdateFilterConfigDto } from '../application/dto/update-filter-config.dto';
import { UpdateJourneyConfigDto } from '../application/dto/update-journey-config.dto';
import { UpdateNotificationConfigDto } from '../application/dto/update-notification-config.dto';
import { CreateMcpServerDto } from '../application/dto/create-mcp-server.dto';
import { UpdateMcpServerDto } from '../application/dto/update-mcp-server.dto';
import {
  CreateKnowledgeFileDto,
  UpdateKnowledgeFileDto,
} from '../application/dto/knowledge-file.dto';

@ApiTags('Agentes de IA')
@Controller()
export class AiAgentController {
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly promptSheetService: PromptSheetService,
  ) {}

  // ─── Agents ───────────────────────────────────────────────────────────────

  @Post('companies/:companyId/ai-agents')
  @ApiOperation({ summary: 'Criar agente de IA para a empresa' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  createAgent(
    @Param('companyId') companyId: string,
    @Body() dto: CreateAgentDto,
  ) {
    return this.aiAgentService.createAgent(companyId, dto);
  }

  @Get('companies/:companyId/ai-agents')
  @ApiOperation({ summary: 'Listar agentes de IA da empresa' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  listAgents(@Param('companyId') companyId: string) {
    return this.aiAgentService.listAgents(companyId);
  }

  @Get('ai-agents/:agentId')
  @ApiOperation({ summary: 'Buscar agente com todas as configurações' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  getAgent(@Param('agentId') agentId: string) {
    return this.aiAgentService.getAgent(agentId);
  }

  @Patch('ai-agents/:agentId')
  @ApiOperation({ summary: 'Atualizar dados base do agente (nome, descrição)' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateAgent(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateAgentBaseDto,
  ) {
    return this.aiAgentService.updateAgent(agentId, dto);
  }

  @Patch('ai-agents/:agentId/toggle')
  @ApiOperation({ summary: 'Ativar / desativar agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  toggleAgent(@Param('agentId') agentId: string) {
    return this.aiAgentService.toggleAgent(agentId);
  }

  @Delete('ai-agents/:agentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover agente e todas as suas configurações' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  async deleteAgent(@Param('agentId') agentId: string) {
    await this.aiAgentService.deleteAgent(agentId);
  }

  // ─── Agent Configs ────────────────────────────────────────────────────────

  @Patch('ai-agents/:agentId/persona')
  @ApiOperation({ summary: 'Atualizar persona e prompts do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updatePersona(
    @Param('agentId') agentId: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return this.aiAgentService.updatePersona(agentId, dto);
  }

  @Patch('ai-agents/:agentId/model-config')
  @ApiOperation({ summary: 'Atualizar configurações do modelo LLM' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateModelConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateModelConfigDto,
  ) {
    return this.aiAgentService.updateModelConfig(agentId, dto);
  }

  @Patch('ai-agents/:agentId/memory-config')
  @ApiOperation({ summary: 'Atualizar configuração de memória do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateMemoryConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateMemoryConfigDto,
  ) {
    return this.aiAgentService.updateMemoryConfig(agentId, dto);
  }

  @Patch('ai-agents/:agentId/media-config')
  @ApiOperation({ summary: 'Atualizar configuração de mídia do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateMediaConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateMediaConfigDto,
  ) {
    return this.aiAgentService.updateMediaConfig(agentId, dto);
  }

  @Patch('ai-agents/:agentId/filter-config')
  @ApiOperation({ summary: 'Atualizar filtros de mensagens do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateFilterConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateFilterConfigDto,
  ) {
    return this.aiAgentService.updateFilterConfig(agentId, dto);
  }

  @Patch('ai-agents/:agentId/notification-config')
  @ApiOperation({
    summary: 'Atualizar configuração de notificação quando o cliente pedir ajuda',
  })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateNotificationConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateNotificationConfigDto,
  ) {
    return this.aiAgentService.updateNotificationConfig(agentId, dto);
  }

  @Patch('ai-agents/:agentId/journey-config')
  @ApiOperation({ summary: 'Atualizar configuração de jornada do cliente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateJourneyConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpdateJourneyConfigDto,
  ) {
    return this.aiAgentService.updateJourneyConfig(agentId, dto);
  }

  @Post('companies/:companyId/ai-agents/:agentId/webhook')
  @ApiOperation({
    summary: 'Reconfigurar (atualizar) o webhook do agente na instância WhatsApp',
  })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  updateAgentWebhook(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.aiAgentService.updateAgentWebhook(companyId, agentId);
  }

  // ─── MCP Servers ─────────────────────────────────────────────────────────

  @Post('ai-agents/:agentId/mcp-servers')
  @ApiOperation({ summary: 'Adicionar MCP Server ao agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  createMcpServer(
    @Param('agentId') agentId: string,
    @Body() dto: CreateMcpServerDto,
  ) {
    return this.aiAgentService.createMcpServer(agentId, dto);
  }

  @Get('ai-agents/:agentId/mcp-servers')
  @ApiOperation({ summary: 'Listar MCP Servers do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  listMcpServers(@Param('agentId') agentId: string) {
    return this.aiAgentService.listMcpServers(agentId);
  }

  @Get('mcp-servers/:mcpServerId')
  @ApiOperation({ summary: 'Buscar MCP Server por ID' })
  @ApiParam({ name: 'mcpServerId', description: 'ID do MCP Server' })
  getMcpServer(@Param('mcpServerId') mcpServerId: string) {
    return this.aiAgentService.getMcpServer(mcpServerId);
  }

  @Patch('mcp-servers/:mcpServerId')
  @ApiOperation({ summary: 'Atualizar MCP Server' })
  @ApiParam({ name: 'mcpServerId', description: 'ID do MCP Server' })
  updateMcpServer(
    @Param('mcpServerId') mcpServerId: string,
    @Body() dto: UpdateMcpServerDto,
  ) {
    return this.aiAgentService.updateMcpServer(mcpServerId, dto);
  }

  @Patch('mcp-servers/:mcpServerId/toggle')
  @ApiOperation({ summary: 'Habilitar / desabilitar MCP Server' })
  @ApiParam({ name: 'mcpServerId', description: 'ID do MCP Server' })
  toggleMcpServer(@Param('mcpServerId') mcpServerId: string) {
    return this.aiAgentService.toggleMcpServer(mcpServerId);
  }

  @Delete('mcp-servers/:mcpServerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover MCP Server' })
  @ApiParam({ name: 'mcpServerId', description: 'ID do MCP Server' })
  async deleteMcpServer(@Param('mcpServerId') mcpServerId: string) {
    await this.aiAgentService.deleteMcpServer(mcpServerId);
  }

  // ─── LLM Models ──────────────────────────────────────────────────────────

  @Get('llm/models')
  @ApiOperation({ summary: 'Listar modelos LLM disponíveis (OpenRouter via LavAI Agent)' })
  listLlmModels() {
    return this.aiAgentService.listLlmModels();
  }

  // ─── Conversas ─────────────────────────────────────────────────────────────

  @Get('ai-agents/:agentId/conversations')
  @ApiOperation({ summary: 'Listar conversas do agente (agrupadas por cliente)' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  listConversations(
    @Param('agentId') agentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.aiAgentService.listConversations(agentId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('ai-agents/:agentId/conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Listar mensagens de uma conversa (sem dados técnicos)' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no over-agent' })
  @ApiParam({ name: 'conversationId', description: 'ID da conversa' })
  listConversationMessages(
    @Param('agentId') agentId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.aiAgentService.listConversationMessages(agentId, conversationId);
  }

  // ─── Knowledge files ─────────────────────────────────────────────────────

  @Get('companies/:companyId/ai-agents/:agentId/knowledge-files')
  @ApiOperation({ summary: 'Listar arquivos da base de conhecimento do agente' })
  listKnowledgeFiles(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.aiAgentService.listKnowledgeFiles(companyId, agentId);
  }

  @Post('companies/:companyId/ai-agents/:agentId/knowledge-files')
  @ApiOperation({ summary: 'Adicionar arquivo à base de conhecimento' })
  createKnowledgeFile(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
    @Body() dto: CreateKnowledgeFileDto,
  ) {
    return this.aiAgentService.createKnowledgeFile(companyId, agentId, dto);
  }

  @Put('companies/:companyId/ai-agents/:agentId/knowledge-files/:fileId')
  @ApiOperation({ summary: 'Atualizar metadados do arquivo de conhecimento' })
  updateKnowledgeFile(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateKnowledgeFileDto,
  ) {
    return this.aiAgentService.updateKnowledgeFile(companyId, agentId, fileId, dto);
  }

  @Delete('companies/:companyId/ai-agents/:agentId/knowledge-files/:fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover arquivo da base de conhecimento' })
  async deleteKnowledgeFile(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.aiAgentService.deleteKnowledgeFile(companyId, agentId, fileId);
  }

  // ─── Prompt sheet ─────────────────────────────────────────────────────────

  @Get('companies/:companyId/ai-agents/prompt-sheet')
  @ApiOperation({ summary: 'Obter ficha de prompt (rascunho da empresa)' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  getPromptSheet(@Param('companyId') companyId: string) {
    return this.promptSheetService.get(companyId, 'draft');
  }

  @Put('companies/:companyId/ai-agents/prompt-sheet')
  @ApiOperation({ summary: 'Gravar resposta na ficha de prompt (rascunho da empresa)' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  putPromptSheetAnswer(
    @Param('companyId') companyId: string,
    @Body() body: { key: string; value: string; sheetUpdatedAt?: string },
  ) {
    if (body.sheetUpdatedAt) {
      return this.promptSheetService.applyAcceptedAnswer(
        companyId,
        'draft',
        body.key,
        body.value,
        body.sheetUpdatedAt,
      );
    }
    return this.promptSheetService.putAnswer(
      companyId,
      'draft',
      body.key,
      body.value,
    );
  }

  @Get('companies/:companyId/ai-agents/:agentId/prompt-sheet')
  @ApiOperation({ summary: 'Obter ficha de prompt do agente' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  getPromptSheetForAgent(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.promptSheetService.get(companyId, agentId);
  }

  @Put('companies/:companyId/ai-agents/:agentId/prompt-sheet')
  @ApiOperation({ summary: 'Gravar resposta na ficha de prompt do agente' })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  putPromptSheetAnswerForAgent(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
    @Body() body: { key: string; value: string; sheetUpdatedAt?: string },
  ) {
    if (body.sheetUpdatedAt) {
      return this.promptSheetService.applyAcceptedAnswer(
        companyId,
        agentId,
        body.key,
        body.value,
        body.sheetUpdatedAt,
      );
    }
    return this.promptSheetService.putAnswer(
      companyId,
      agentId,
      body.key,
      body.value,
    );
  }

  @Post('companies/:companyId/ai-agents/:agentId/prompt-sheet/adopt')
  @ApiOperation({
    summary: 'Copiar ficha rascunho da empresa para o agente lavai',
  })
  @ApiParam({ name: 'companyId', description: 'ID interno da empresa' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  adoptPromptSheet(
    @Param('companyId') companyId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.promptSheetService.adopt(companyId, agentId);
  }

  // ─── Prompt studio ────────────────────────────────────────────────────────

  @Post('ai-agents/prompt-studio/generate')
  @ApiOperation({ summary: 'Gerar documento de prompt na criação do agente' })
  generatePrompt(@Body() dto: Record<string, unknown>) {
    return this.aiAgentService.generatePrompt(dto);
  }

  @Post('ai-agents/prompt-studio/test')
  @ApiOperation({ summary: 'Testar pergunta na criação do agente (sem base de conhecimento)' })
  testPrompt(
    @Body()
    dto: {
      document: unknown;
      question: string;
      modelName?: string;
      ragChunks?: Array<{ content: string; score: number; id: string }>;
    },
  ) {
    return this.aiAgentService.testPrompt({ ...dto, ragChunks: [] });
  }

  @Post('ai-agents/prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt na criação, sem persistir' })
  proposePromptEdit(@Body() dto: Record<string, unknown>) {
    return this.aiAgentService.proposePromptEdit(dto);
  }

  @Post('ai-agents/:agentId/prompt-studio/generate')
  @ApiOperation({ summary: 'Gerar documento de prompt de um agente salvo' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  generatePromptForAgent(
    @Param('agentId') agentId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.aiAgentService.generatePrompt(dto, agentId);
  }

  @Post('ai-agents/:agentId/prompt-studio/test')
  @ApiOperation({
    summary: 'Testar pergunta de um agente salvo com os chunks do atendimento',
  })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  testPromptForAgent(
    @Param('agentId') agentId: string,
    @Body()
    dto: {
      document: unknown;
      question: string;
      modelName?: string;
      ragChunks?: Array<{ content: string; score: number; id: string }>;
    },
  ) {
    return this.aiAgentService.testPrompt(dto, agentId);
  }

  @Post('ai-agents/:agentId/prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt de um agente salvo, sem persistir' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  proposePromptEditForAgent(
    @Param('agentId') agentId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.aiAgentService.proposePromptEdit(dto, agentId);
  }

  @Get('ai-agents/:agentId/prompt-studio/thread')
  @ApiOperation({ summary: 'Obter o chat especialista do agente' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  getPromptStudioThread(@Param('agentId') agentId: string) {
    return this.aiAgentService.getPromptStudioThread(agentId);
  }

  @Post('ai-agents/:agentId/prompt-studio/thread/messages')
  @ApiOperation({ summary: 'Enviar mensagem no chat especialista' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  sendPromptStudioMessage(
    @Param('agentId') agentId: string,
    @Body() dto: { content: string; document: unknown },
  ) {
    return this.aiAgentService.sendPromptStudioMessage(
      agentId,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Post('ai-agents/:agentId/prompt-studio/thread/discard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Descartar proposta pendente do chat especialista' })
  @ApiParam({ name: 'agentId', description: 'ID do agente no lavai-agent' })
  async discardPromptStudioProposal(@Param('agentId') agentId: string) {
    await this.aiAgentService.discardPromptStudioProposal(agentId);
  }
}
