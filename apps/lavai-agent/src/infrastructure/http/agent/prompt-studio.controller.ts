import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FindAgentByIdUseCase } from '../../../application/agent/use-cases/find-agent-by-id.use-case';
import { AgentRunnerService } from '../../../application/agent-runner/services/agent-runner.service';
import { GeneratePromptUseCase } from '../../../application/prompt-studio/generate-prompt.use-case';
import { ProposePromptEditUseCase } from '../../../application/prompt-studio/propose-prompt-edit.use-case';
import { PromptStudioThreadUseCase } from '../../../application/prompt-studio/prompt-studio-thread.use-case';
import { TestPromptUseCase } from '../../../application/prompt-studio/test-prompt.use-case';
import type { PromptDocument, QuestionnaireAnswers } from '../../../application/prompt-studio/prompt-studio.types';
import type { ProposePromptEditInput } from '../../../application/prompt-studio/propose-prompt-edit.use-case';

const DEFAULT_MODEL = 'openai/gpt-5';

type GenerateBody = QuestionnaireAnswers & { modelName?: string };

type TestBody = {
  document: PromptDocument;
  question: string;
  modelName?: string;
  ragChunks?: Array<{ content: string; score: number; id: string }>;
};

type ThreadMessageBody = {
  content: string;
  document: PromptDocument;
  modelName?: string;
};

@ApiTags('prompt-studio')
@Controller()
export class PromptStudioController {
  constructor(
    private readonly generatePrompt: GeneratePromptUseCase,
    private readonly testPrompt: TestPromptUseCase,
    private readonly proposePromptEdit: ProposePromptEditUseCase,
    private readonly thread: PromptStudioThreadUseCase,
    private readonly findAgentById: FindAgentByIdUseCase,
    private readonly agentRunner: AgentRunnerService,
  ) {}

  @Post('prompt-studio/generate')
  @ApiOperation({ summary: 'Gerar documento de prompt a partir do questionário' })
  generate(@Body() body: GenerateBody) {
    const { modelName, ...answers } = body;
    return this.generatePrompt.execute({ answers, modelName });
  }

  @Post('agents/:agentId/prompt-studio/generate')
  @ApiOperation({ summary: 'Gerar documento de prompt para um agente existente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async generateForAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: GenerateBody,
  ) {
    await this.findAgentById.execute(agentId);
    return this.generate(body);
  }

  @Post('prompt-studio/test')
  @ApiOperation({ summary: 'Testar uma pergunta contra o documento (sem WhatsApp)' })
  test(@Body() body: TestBody) {
    return this.testPrompt.execute({
      document: body.document,
      question: body.question,
      modelName: body.modelName,
      ragChunks: body.ragChunks ?? [],
    });
  }

  @Post('agents/:agentId/prompt-studio/test')
  @ApiOperation({ summary: 'Testar pergunta usando os chunks RAG do atendimento do agente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async testForAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: TestBody,
  ) {
    const agent = await this.findAgentById.execute(agentId);
    const ragChunks = await this.agentRunner.fetchRagChunks(body.question, agent.companyId);
    return this.testPrompt.execute({
      document: body.document,
      question: body.question,
      modelName: body.modelName,
      ragChunks: ragChunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        score: chunk.score,
      })),
    });
  }

  @Post('prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt sem persistir' })
  propose(@Body() body: ProposePromptEditInput) {
    return this.proposePromptEdit.execute(body);
  }

  @Post('agents/:agentId/prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt de um agente sem persistir' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async proposeForAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: ProposePromptEditInput,
  ) {
    await this.findAgentById.execute(agentId);
    return this.propose(body);
  }

  @Get('agents/:agentId/prompt-studio/thread')
  @ApiOperation({ summary: 'Obter o chat especialista do agente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  getThread(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.thread.get(agentId);
  }

  @Post('agents/:agentId/prompt-studio/thread/messages')
  @ApiOperation({ summary: 'Enviar mensagem no chat especialista' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async sendMessage(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: ThreadMessageBody,
  ) {
    const agent = await this.findAgentById.execute(agentId);
    const currentUpdatedAt = agent.persona?.updatedAt
      ? agent.persona.updatedAt.toISOString()
      : '';
    const modelName = body.modelName ?? agent.modelConfig?.modelName ?? DEFAULT_MODEL;
    return this.thread.send(
      agentId,
      body.content,
      body.document,
      currentUpdatedAt,
      modelName,
    );
  }

  @Post('agents/:agentId/prompt-studio/thread/discard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Descartar proposta pendente do chat especialista' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async discard(@Param('agentId', ParseUUIDPipe) agentId: string): Promise<void> {
    await this.thread.discard(agentId);
  }
}
