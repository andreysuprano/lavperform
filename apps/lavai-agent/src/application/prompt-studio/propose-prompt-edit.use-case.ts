import { BadGatewayException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { documentKeepsFacts } from './fact-fidelity';
import { parseProposal } from './parse-model-json';
import { isProposalStale } from './proposal-staleness';
import type { PromptDocument, PromptProposal } from './prompt-studio.types';

const DEFAULT_MODEL = 'openai/gpt-5';
const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';

const SYSTEM_MESSAGE = [
  'Responda apenas com JSON válido contendo as chaves:',
  'summary, changes (objeto com as partes alteradas do prompt nos quatro campos),',
  'baseUpdatedAt e opcionalmente answerKey e answerValue (chave e texto da ficha).',
  'Devolva a alteração nos quatro campos do prompt.',
  'Copie os fatos sem reescrever valor, horário ou regra.',
].join(' ');

export interface ProposePromptEditInput {
  document: PromptDocument;
  question: string;
  answer: string;
  whatWasWrong: string;
  baseUpdatedAt?: string;
  currentUpdatedAt: string | null;
  draftChanged: boolean;
  facts?: Array<{ text: string }>;
  sheetUpdatedAt?: string;
  currentSheetUpdatedAt?: string | null;
  modelName?: string;
}

@Injectable()
export class ProposePromptEditUseCase {
  constructor(
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
  ) {}

  async execute(input: ProposePromptEditInput): Promise<PromptProposal> {
    const facts = input.facts ?? [];

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
            facts,
            baseUpdatedAt: input.baseUpdatedAt,
            sheetUpdatedAt: input.sheetUpdatedAt,
          }),
        },
      ],
    });

    const parsed = parseProposal(response.content ?? '');
    if (parsed === null) {
      throw new BadGatewayException();
    }

    const merged: PromptDocument = {
      ...input.document,
      ...parsed.changes,
    };

    if (facts.length > 0 && !documentKeepsFacts(merged, facts)) {
      throw new BadGatewayException();
    }

    if (
      parsed.answerValue &&
      !documentKeepsFacts(merged, [{ text: parsed.answerValue }])
    ) {
      throw new BadGatewayException();
    }

    const proposal: PromptProposal = {
      summary: parsed.summary,
      changes: parsed.changes,
      baseUpdatedAt: input.baseUpdatedAt,
    };

    if (input.sheetUpdatedAt) {
      proposal.sheetUpdatedAt = input.sheetUpdatedAt;
    }

    if (parsed.answerKey) {
      proposal.answerKey = parsed.answerKey;
    }

    if (parsed.answerValue) {
      proposal.answerValue = parsed.answerValue;
    }

    if (
      isProposalStale(
        proposal,
        input.currentUpdatedAt,
        input.draftChanged,
        input.currentSheetUpdatedAt,
      )
    ) {
      throw new ConflictException(STALE_MESSAGE);
    }

    return proposal;
  }
}
