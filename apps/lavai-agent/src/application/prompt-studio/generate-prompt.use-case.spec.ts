import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { GeneratePromptUseCase } from './generate-prompt.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { scriptFor } from './sheet-script';

function provider(content: string | null): LlmProviderPort & { complete: jest.Mock } {
  return {
    complete: jest.fn().mockResolvedValue({ content, toolCalls: [], finishReason: 'stop' }),
  };
}

function completeAnswers(
  model: 'CONVENTIONAL' | 'SELF_SERVICE',
  overrides: Record<string, string> = {},
): Record<string, string> {
  return Object.fromEntries(
    scriptFor(model).map((field) => [
      field.key,
      overrides[field.key] ?? (field.key === 'priceWash' ? 'R$ 20' : 'sim'),
    ]),
  );
}

const happyDocument = {
  contextPrompt: 'Lavagem: R$ 20. sim',
  systemPrompt: 'Foco no atendimento.',
  behaviorGuidelines: 'Tom cordial.',
  guardrails: 'Limites claros.',
  suggestedQuestions: ['Horário?', 'Preço?', 'Prazo?', 'Buscam?'],
};

describe('GeneratePromptUseCase', () => {
  it('não chama o modelo se a ficha está incompleta', async () => {
    const llm = provider(JSON.stringify(happyDocument));
    const useCase = new GeneratePromptUseCase(llm);
    await expect(
      useCase.execute({
        model: 'CONVENTIONAL',
        answers: { name: 'Lavanderia' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('ignora o texto quando o preço da ficha some', async () => {
    const llm = provider(
      JSON.stringify({
        contextPrompt: 'Lavagem: R$ 25.',
        systemPrompt: 'Foco.',
        behaviorGuidelines: 'Tom.',
        guardrails: 'Limites.',
        suggestedQuestions: ['a', 'b', 'c', 'd'],
      }),
    );
    const useCase = new GeneratePromptUseCase(llm);
    const answers = Object.fromEntries(
      scriptFor('CONVENTIONAL').map((field) => [
        field.key,
        field.key === 'priceWash' ? 'R$ 20' : 'sim',
      ]),
    );
    await expect(useCase.execute({ model: 'CONVENTIONAL', answers })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('monta o documento a partir da ficha completa', async () => {
    const llm = provider(JSON.stringify(happyDocument));
    const useCase = new GeneratePromptUseCase(llm);
    const answers = completeAnswers('CONVENTIONAL');

    const result = await useCase.execute({ model: 'CONVENTIONAL', answers });

    expect(result.document.contextPrompt).toContain('R$ 20');
    expect(result.suggestedQuestions).toHaveLength(4);
    expect(llm.complete).toHaveBeenCalledTimes(1);

    const call = llm.complete.mock.calls[0][0];
    expect(call.model).toBe('openai/gpt-5');
    expect(call.temperature).toBe(0.2);
    expect(call.messages[0].role).toBe('system');
    expect(call.messages[0].content).toMatch(/SELF_SERVICE|CONVENTIONAL/);
    expect(call.messages[0].content).toMatch(/copiar|copie/i);
    expect(call.messages[1].role).toBe('user');
    expect(JSON.parse(call.messages[1].content)).toMatchObject({ model: 'CONVENTIONAL' });
  });
});
