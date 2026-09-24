import { BadGatewayException, ConflictException } from '@nestjs/common';
import { ProposePromptEditUseCase } from './propose-prompt-edit.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';

const document = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};
const input = {
  document,
  question: 'Quanto custa?',
  answer: 'Custa 50 reais',
  whatWasWrong: 'Inventou o preço',
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
  currentUpdatedAt: '2026-09-24T00:00:00.000Z',
  draftChanged: false,
};

describe('ProposePromptEditUseCase', () => {
  it('devolve a parte alterada sem gravar persona', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' }, baseUpdatedAt: input.baseUpdatedAt }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result.changes.guardrails).toBe('Não informe preço');
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it('recusa changes vazias', async () => {
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: JSON.stringify({ summary: 'x', changes: {} }), toolCalls: [], finishReason: 'stop' }) };
    await expect(new ProposePromptEditUseCase(llm).execute(input)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('recusa proposta sobre texto que já mudou', async () => {
    const llm: LlmProviderPort = {
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' } }),
        toolCalls: [],
        finishReason: 'stop',
      }),
    };
    await expect(new ProposePromptEditUseCase(llm).execute({
      ...input,
      currentUpdatedAt: '2026-09-24T01:00:00.000Z',
    })).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
    await expect(new ProposePromptEditUseCase(llm).execute({
      ...input,
      currentUpdatedAt: '2026-09-24T01:00:00.000Z',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
