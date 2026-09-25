import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { documentKeepsFacts } from './fact-fidelity';
import { parseGeneratedDocument } from './parse-model-json';
import { factsFromSheet, isSheetComplete } from './sheet-answers';
import { scriptFor, type ServiceModel } from './sheet-script';
import type { PromptDocument } from './prompt-studio.types';

const DEFAULT_MODEL = 'openai/gpt-5';

const SYSTEM_MESSAGE = [
  'Responda apenas com JSON válido contendo as chaves:',
  'contextPrompt, systemPrompt, behaviorGuidelines, guardrails',
  'e suggestedQuestions (array de 4 a 6 perguntas).',
  'Copie cada fato da ficha no texto.',
  'Não altere valor, horário ou regra.',
  'SELF_SERVICE inclui o passo a passo de operar a máquina.',
  'CONVENTIONAL não inclui esse passo a passo e inclui coleta, atendente e serviço da loja.',
].join(' ');

export interface GeneratePromptInput {
  model: ServiceModel;
  answers: Record<string, string>;
  modelName?: string;
}

export interface GeneratePromptResult {
  document: PromptDocument;
  suggestedQuestions: string[];
}

function missingKeys(model: ServiceModel, answers: Record<string, string>): string[] {
  return scriptFor(model)
    .filter((field) => {
      const value = answers[field.key];
      return !(typeof value === 'string' && value.trim() !== '');
    })
    .map((field) => field.key);
}

@Injectable()
export class GeneratePromptUseCase {
  constructor(
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
  ) {}

  async execute(input: GeneratePromptInput): Promise<GeneratePromptResult> {
    if (!isSheetComplete(input.model, input.answers)) {
      throw new BadRequestException(missingKeys(input.model, input.answers));
    }

    const facts = factsFromSheet(input.model, input.answers);

    const response = await this.llm.complete({
      model: input.modelName ?? DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: JSON.stringify({ model: input.model, facts }) },
      ],
    });

    const parsed = parseGeneratedDocument(response.content ?? '');
    if (parsed === null) {
      throw new BadGatewayException('Resposta do modelo fora do formato');
    }

    if (!documentKeepsFacts(parsed.document, facts)) {
      throw new BadGatewayException('Fato da ficha alterado');
    }

    return parsed;
  }
}
