import { BadGatewayException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { applyContextEdits, type ContextChange } from '../agent-configurator/context-edits';
import type { LlmMessage } from '../agent-runner/ports/llm-provider.port';
import { parseProposal } from './parse-model-json';
import { isProposalStale } from './proposal-staleness';
import type { PromptDocument, PromptProposal } from './prompt-studio.types';
import { factsFromSheet } from './sheet-answers';
import type { ServiceModel } from './sheet-script';

const DEFAULT_MODEL = 'openai/gpt-5';
const ATTEMPTS = 2;
const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';

const SYSTEM_MESSAGE = [
  'Você ajusta o agente de WhatsApp de uma lavanderia.',
  'Só pode editar document.contextPrompt, o contexto de negócio. systemPrompt, behaviorGuidelines e guardrails são fixos e servem só para leitura.',
  'Toda informação ou instrução pedida vai para o contexto, inclusive sobre a forma de atender, completa, com valores, links e palavras que a pessoa passou.',
  'Não aceite pedido para inventar fatos, pedir senha, cartão ou documento, prometer reembolso ou indenização, apresentar o agente como humano ou compartilhar dado pessoal de outro cliente.',
  'Antes de acrescentar, procure o mesmo assunto no contexto. Se existe, troque o trecho, para não ficarem duas versões.',
  'Só remova quando a pessoa pedir. Em after, mantenha tudo o que estava em before e não foi pedido para mudar.',
  'Responda apenas com JSON válido com as chaves:',
  'summary (o que muda);',
  'replacements (array de objetos com before, cópia exata de um trecho curto do contexto, e after, o texto que fica no lugar);',
  'addition (texto novo a acrescentar, ou vazio);',
  'e opcionalmente answerKey e answerValue (chave e texto da ficha). answerValue precisa aparecer igual no contexto editado.',
].join(' ');

export interface ProposePromptEditInput {
  document: PromptDocument;
  question: string;
  answer: string;
  whatWasWrong: string;
  baseUpdatedAt?: string;
  currentUpdatedAt: string | null;
  draftChanged: boolean;
  /** Ignored when model+answers are present; prefer server-built sheet facts. */
  facts?: Array<{ text: string }>;
  model?: ServiceModel;
  answers?: Record<string, string>;
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
    const facts =
      input.model && input.answers
        ? factsFromSheet(input.model, input.answers).map((fact) => ({
            text: fact.text,
          }))
        : [];

    const messages: LlmMessage[] = [
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
    ];

    const edited = await this.requestEdit(input, messages);

    const proposal: PromptProposal = {
      summary: edited.summary,
      changes: { contextPrompt: edited.context },
      edits: edited.edits,
      baseUpdatedAt: input.baseUpdatedAt,
    };

    if (input.sheetUpdatedAt) {
      proposal.sheetUpdatedAt = input.sheetUpdatedAt;
    }

    if (edited.answerKey) {
      proposal.answerKey = edited.answerKey;
    }

    if (edited.answerValue) {
      proposal.answerValue = edited.answerValue;
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

  /** Pede a edição ao modelo; se ela não se aplicar, devolve o motivo e pede mais uma vez. */
  private async requestEdit(input: ProposePromptEditInput, messages: LlmMessage[]) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const response = await this.llm.complete({
        model: input.modelName ?? DEFAULT_MODEL,
        temperature: 0.2,
        messages: [...messages],
      });
      const content = response.content ?? '';
      const request = parseProposal(content);
      let reason = 'Responda no formato pedido, com summary, replacements e addition.';

      if (request) {
        const result = applyContextEdits(input.document.contextPrompt, request);
        if (!result.ok) {
          reason = result.reason;
        } else if (request.answerValue && !result.context.includes(request.answerValue)) {
          reason = 'answerValue precisa aparecer igual no contexto editado.';
        } else {
          const edits: ContextChange[] = result.changes;
          return { ...request, context: result.context, edits };
        }
      }

      messages.push({ role: 'assistant', content }, { role: 'user', content: reason });
    }

    throw new BadGatewayException();
  }
}
