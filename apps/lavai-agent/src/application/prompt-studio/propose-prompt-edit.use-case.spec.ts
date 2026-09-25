import { BadGatewayException, ConflictException } from '@nestjs/common';
import { ProposePromptEditUseCase } from './propose-prompt-edit.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';

const document = {
  contextPrompt: 'Lavanderia. Preço: R$ 20.',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};
const sheetUpdatedAt = '2026-09-25T10:00:00.000Z';
const input = {
  document,
  question: 'Quanto custa?',
  answer: 'Custa 50 reais',
  whatWasWrong: 'Inventou o preço',
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
  currentUpdatedAt: '2026-09-24T00:00:00.000Z',
  draftChanged: false,
  facts: [{ text: 'R$ 20' }],
  sheetUpdatedAt,
  currentSheetUpdatedAt: sheetUpdatedAt,
};

describe('ProposePromptEditUseCase', () => {
  it('devolve a parte alterada sem gravar persona', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Tira o preço inventado',
          changes: { guardrails: 'Não invente. Preço: R$ 20.' },
          baseUpdatedAt: input.baseUpdatedAt,
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result.changes.guardrails).toBe('Não invente. Preço: R$ 20.');
    expect(result.sheetUpdatedAt).toBe(sheetUpdatedAt);
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it('recusa changes vazias', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({ summary: 'x', changes: {} }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(new ProposePromptEditUseCase(llm).execute(input)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('recusa proposta sobre texto que já mudou', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Tira o preço',
          changes: { guardrails: 'Não invente. Preço: R$ 20.' },
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(
      new ProposePromptEditUseCase(llm).execute({
        ...input,
        currentUpdatedAt: '2026-09-24T01:00:00.000Z',
      }),
    ).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    await expect(
      new ProposePromptEditUseCase(llm).execute({
        ...input,
        currentUpdatedAt: '2026-09-24T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('recusa proposta quando o documento mesclado perde um fato', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Muda preço',
          changes: { contextPrompt: 'Lavanderia. Preço: R$ 25.' },
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(new ProposePromptEditUseCase(llm).execute(input)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('recusa proposta quando a ficha já mudou', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Tira o preço',
          changes: { guardrails: 'Não invente. Preço: R$ 20.' },
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(
      new ProposePromptEditUseCase(llm).execute({
        ...input,
        currentSheetUpdatedAt: '2026-09-25T12:00:00.000Z',
      }),
    ).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    await expect(
      new ProposePromptEditUseCase(llm).execute({
        ...input,
        currentSheetUpdatedAt: '2026-09-25T12:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('recusa proposta quando answerValue não aparece no documento mesclado', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Ajusta preço',
          changes: { guardrails: 'Não invente. Preço: R$ 20.' },
          answerKey: 'pricing',
          answerValue: 'Preço especial R$ 15',
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(new ProposePromptEditUseCase(llm).execute(input)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
