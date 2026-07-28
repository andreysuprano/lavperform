import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  OpenRouterLlmService,
  OpenRouterModel,
} from '../../providers/openrouter/openrouter-llm.service';

@ApiTags('LLM')
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: OpenRouterLlmService) {}

  @Get('models')
  @ApiOperation({
    summary: 'Listar modelos LLM disponíveis',
    description:
      'Retorna os modelos disponíveis no OpenRouter. ' +
      'Use o campo `id` como valor de `modelName` na configuração do agente.',
  })
  listModels(): Promise<OpenRouterModel[]> {
    return this.llmService.listModels();
  }
}
