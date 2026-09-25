import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { GeneratePromptUseCase } from './generate-prompt.use-case';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import type { QuestionnaireAnswers } from './prompt-studio.types';

const answers: QuestionnaireAnswers = {
  services: 'Lavagem',
  focus: 'Atender no WhatsApp',
  mustNotPromise: 'Não prometer prazo',
  hoursAndDeadline: '8h às 18h',
  pricing: 'Não passar preço',
  handoff: 'Quando pedir humano',
  voiceTone: 'FRIENDLY',
  communicationStyle: 'BALANCED',
};

const generated = {
  contextPrompt: 'Lavanderia',
  systemPrompt: 'Atender no WhatsApp',
  behaviorGuidelines: 'Confirme o prazo',
  guardrails: 'Não invente preço',
  suggestedQuestions: ['Horário?', 'Preço?', 'Prazo?', 'Buscam?'],
};

function provider(content: string | null): LlmProviderPort {
  return { complete: jest.fn().mockResolvedValue({ content, toolCalls: [], finishReason: 'stop' }) };
}

describe('GeneratePromptUseCase', () => {
  it('não chama o modelo sem obrigatória', async () => {
    const llm = provider(JSON.stringify(generated));
    const useCase = new GeneratePromptUseCase(llm);
    await expect(useCase.execute({ answers: { ...answers, services: ' ' } })).rejects.toBeInstanceOf(BadRequestException);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('usa openai/gpt-5 e devolve o documento', async () => {
    const llm = provider(JSON.stringify(generated));
    const result = await new GeneratePromptUseCase(llm).execute({ answers });
    expect(result.document.systemPrompt).toBe('Atender no WhatsApp');
    expect(result.suggestedQuestions).toHaveLength(4);
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-5');
  });

  it('respeita modelName e recusa JSON inválido', async () => {
    const llm = provider(JSON.stringify(generated));
    await new GeneratePromptUseCase(llm).execute({ answers, modelName: 'openai/gpt-4o' });
    expect(jest.mocked(llm.complete).mock.calls[0][0].model).toBe('openai/gpt-4o');
    const broken = provider('não é json');
    await expect(new GeneratePromptUseCase(broken).execute({ answers })).rejects.toBeInstanceOf(BadGatewayException);
  });
});
