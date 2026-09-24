import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { validateQuestionnaire } from './validate-questionnaire';
import { parseGeneratedDocument } from './parse-model-json';
import type { PromptDocument, QuestionnaireAnswers } from './prompt-studio.types';

const DEFAULT_MODEL = 'openai/gpt-5';

const SYSTEM_MESSAGE = [
  'Responda apenas com JSON válido contendo as chaves:',
  'contextPrompt, systemPrompt, behaviorGuidelines, guardrails',
  'e suggestedQuestions (array de 4 a 6 perguntas).',
].join(' ');

export interface GeneratePromptInput {
  answers: QuestionnaireAnswers;
  modelName?: string;
}

export interface GeneratePromptResult {
  document: PromptDocument;
  suggestedQuestions: string[];
}

@Injectable()
export class GeneratePromptUseCase {
  constructor(
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
  ) {}

  async execute(input: GeneratePromptInput): Promise<GeneratePromptResult> {
    const validation = validateQuestionnaire(input.answers);
    if (!validation.ok) {
      throw new BadRequestException(validation.missing);
    }

    const response = await this.llm.complete({
      model: input.modelName ?? DEFAULT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: JSON.stringify(validation.normalized) },
      ],
    });

    const parsed = parseGeneratedDocument(response.content ?? '');
    if (parsed === null) {
      throw new BadGatewayException('Resposta do modelo fora do formato');
    }

    return parsed;
  }
}
