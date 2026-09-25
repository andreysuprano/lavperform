import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FindAgentByIdUseCase } from '../../../application/agent/use-cases/find-agent-by-id.use-case';
import { AgentRunnerService } from '../../../application/agent-runner/services/agent-runner.service';
import { GeneratePromptUseCase } from '../../../application/prompt-studio/generate-prompt.use-case';
import { ProposePromptEditUseCase } from '../../../application/prompt-studio/propose-prompt-edit.use-case';
import { PromptStudioThreadUseCase } from '../../../application/prompt-studio/prompt-studio-thread.use-case';
import { TestPromptUseCase } from '../../../application/prompt-studio/test-prompt.use-case';
import {
  GeneratePromptStudioDto,
  ProposePromptStudioDto,
  TestPromptStudioDto,
} from '../../../application/prompt-studio/dtos/prompt-studio.dto';

const DEFAULT_MODEL = 'openai/gpt-5';

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
  @ApiOperation({ summary: 'Gerar documento de prompt a partir da ficha' })
  generate(@Body() body: GeneratePromptStudioDto) {
    return this.generatePrompt.execute({
      model: body.model,
      answers: body.answers,
      modelName: body.modelName,
    });
  }

  @Post('agents/:agentId/prompt-studio/generate')
  @ApiOperation({ summary: 'Gerar documento de prompt para um agente existente' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async generateForAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: GeneratePromptStudioDto,
  ) {
    const agent = await this.findAgentById.execute(agentId);
    const modelName = body.modelName ?? agent.modelConfig?.modelName ?? DEFAULT_MODEL;
    return this.generatePrompt.execute({
      model: body.model,
      answers: body.answers,
      modelName,
    });
  }

  @Post('prompt-studio/test')
  @ApiOperation({ summary: 'Testar uma pergunta contra o documento (sem WhatsApp)' })
  test(@Body() body: TestPromptStudioDto) {
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
    @Body() body: TestPromptStudioDto,
  ) {
    const agent = await this.findAgentById.execute(agentId);
    const ragChunks = await this.agentRunner.fetchRagChunks(body.question, agent.companyId);
    const modelName = body.modelName ?? agent.modelConfig?.modelName ?? DEFAULT_MODEL;
    return this.testPrompt.execute({
      document: body.document,
      question: body.question,
      modelName,
      ragChunks: ragChunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        score: chunk.score,
      })),
    });
  }

  @Post('prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt sem persistir' })
  propose(@Body() body: ProposePromptStudioDto) {
    return this.proposePromptEdit.execute({
      ...body,
      // Never trust client facts; only server-supplied model+answers build facts.
      facts: undefined,
    });
  }

  @Post('agents/:agentId/prompt-studio/propose')
  @ApiOperation({ summary: 'Propor edição do prompt de um agente sem persistir' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async proposeForAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: ProposePromptStudioDto,
  ) {
    const agent = await this.findAgentById.execute(agentId);
    const currentUpdatedAt = agent.persona?.updatedAt
      ? agent.persona.updatedAt.toISOString()
      : null;
    return this.proposePromptEdit.execute({
      ...body,
      facts: undefined,
      currentUpdatedAt,
    });
  }

  @Post('agents/:agentId/prompt-studio/thread/discard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Descartar proposta pendente do chat especialista' })
  @ApiParam({ name: 'agentId', description: 'UUID do agente' })
  async discard(@Param('agentId', ParseUUIDPipe) agentId: string): Promise<void> {
    await this.thread.discard(agentId);
  }
}
