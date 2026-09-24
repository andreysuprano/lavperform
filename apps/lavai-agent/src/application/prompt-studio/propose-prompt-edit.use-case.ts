import { BadGatewayException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { parseProposal } from './parse-model-json';
import { isProposalStale } from './proposal-staleness';
import type { PromptDocument, PromptProposal } from './prompt-studio.types';

const DEFAULT_MODEL = 'openai/gpt-5';
const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';

const SYSTEM_MESSAGE = [
  'Responda apenas com JSON válido contendo as chaves:',
  'summary, changes (objeto com as partes alteradas do prompt), baseUpdatedAt.',
].join(' ');

export interface ProposePromptEditInput {
  document: PromptDocument;
  question: string;
  answer: string;
  whatWasWrong: string;
  baseUpdatedAt?: string;
  currentUpdatedAt: string | null;
  draftChanged: boolean;
  modelName?: string;
}

@Injectable()
export class ProposePromptEditUseCase {
  constructor(
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
  ) {}

  async execute(input: ProposePromptEditInput): Promise<PromptProposal> {
    const response = await this.llm.complete({
      model: input.modelName ?? DEFAULT_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        {
          role: 'user',
          content: JSON.stringify({
            document: input.document,
            question: input.question,
            answer: input.answer,
            whatWasWrong: input.whatWasWrong,
            baseUpdatedAt: input.baseUpdatedAt,
          }),
        },
      ],
    });

    const parsed = parseProposal(response.content ?? '');
    if (parsed === null) {
      throw new BadGatewayException();
    }

    const proposal: PromptProposal = {
      summary: parsed.summary,
      changes: parsed.changes,
      baseUpdatedAt: input.baseUpdatedAt,
    };

    if (isProposalStale(proposal, input.currentUpdatedAt, input.draftChanged)) {
      throw new ConflictException(STALE_MESSAGE);
    }

    return proposal;
  }
}
