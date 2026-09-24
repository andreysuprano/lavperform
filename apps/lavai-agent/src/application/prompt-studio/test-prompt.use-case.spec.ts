import { BadGatewayException } from '@nestjs/common';
import { TestPromptUseCase } from './test-prompt.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';

const document = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};

describe('TestPromptUseCase', () => {
  it('monta o prompt com histórico vazio e devolve a resposta', async () => {
    const build = jest.fn().mockReturnValue([{ role: 'system', content: 'sys' }, { role: 'user', content: 'Qual o horário?' }]);
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: 'Das 8h às 18h', toolCalls: [], finishReason: 'stop' }) };
    const result = await new TestPromptUseCase({ build } as never, llm).execute({
      document,
      question: 'Qual o horário?',
      ragChunks: [{ id: '1', content: 'Horário 8h-18h', score: 0.9 }],
    });
    expect(result.answer).toBe('Das 8h às 18h');
    expect(build).toHaveBeenCalledWith(
      expect.objectContaining({ persona: expect.objectContaining({ systemPrompt: 'Atender', contextPrompt: 'Lavanderia' }) }),
      [],
      [{ id: '1', content: 'Horário 8h-18h', score: 0.9 }],
      'Qual o horário?',
    );
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-5');
  });

  it('falha quando o modelo não devolve texto', async () => {
    const llm: LlmProviderPort = { complete: jest.fn().mockResolvedValue({ content: null, toolCalls: [], finishReason: 'stop' }) };
    await expect(new TestPromptUseCase({ build: jest.fn().mockReturnValue([]) } as never, llm).execute({
      document,
      question: 'Oi',
    })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
