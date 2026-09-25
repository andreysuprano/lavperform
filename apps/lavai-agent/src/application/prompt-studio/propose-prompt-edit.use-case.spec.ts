import { BadGatewayException, ConflictException } from '@nestjs/common';
import { ProposePromptEditUseCase } from './propose-prompt-edit.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { scriptFor } from './sheet-script';

const model = 'CONVENTIONAL' as const;
const answers = Object.fromEntries(
  scriptFor(model).map((field) => [
    field.key,
    field.key === 'priceWash' ? 'R$ 20' : 'sim',
  ]),
);

const document = {
  contextPrompt: 'Lavanderia. Preço: R$ 20. Demais: sim',
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
  model,
  answers,
  sheetUpdatedAt,
  currentSheetUpdatedAt: sheetUpdatedAt,
};

describe('ProposePromptEditUseCase', () => {
  it('devolve a parte alterada sem gravar persona', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Tira o preço inventado',
          changes: { guardrails: 'Não invente. Preço: R$ 20. Demais: sim' },
          baseUpdatedAt: input.baseUpdatedAt,
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result.changes.guardrails).toBe('Não invente. Preço: R$ 20. Demais: sim');
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
          changes: { guardrails: 'Não invente. Preço: R$ 20. Demais: sim' },
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
          changes: { contextPrompt: 'Lavanderia. Preço: R$ 25. Demais: sim' },
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
          changes: { guardrails: 'Não invente. Preço: R$ 20. Demais: sim' },
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
          changes: { guardrails: 'Não invente. Preço: R$ 20. Demais: sim' },
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

  it('ignora facts do cliente e deriva da ficha', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          summary: 'Ok',
          changes: { guardrails: 'Não invente. Preço: R$ 20. Demais: sim' },
        }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await new ProposePromptEditUseCase(llm).execute({
      ...input,
      facts: [{ text: 'FATO INVENTADO PELO CLIENTE' }],
    });
    const userContent = JSON.parse(
      (llm.complete as jest.Mock).mock.calls[0][0].messages[1].content,
    );
    expect(userContent.facts).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'FATO INVENTADO PELO CLIENTE' })]),
    );
    expect(userContent.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'R$ 20' })]),
    );
  });
});
