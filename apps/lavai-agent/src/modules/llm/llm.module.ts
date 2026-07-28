import { Module } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../../application/agent-runner/ports/llm-provider.port';
import { OpenRouterLlmService } from '../../infrastructure/providers/openrouter/openrouter-llm.service';
import { LlmController } from '../../infrastructure/http/llm/llm.controller';

@Module({
  controllers: [LlmController],
  providers: [
    OpenRouterLlmService,
    { provide: LLM_PROVIDER_PORT, useExisting: OpenRouterLlmService },
  ],
  exports: [LLM_PROVIDER_PORT, OpenRouterLlmService],
})
export class LlmModule {}
