import { OpenRouterLlmService } from './openrouter-llm.service';

function llmWithClient() {
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = previousKey || 'test-key';
  const service = new OpenRouterLlmService();
  if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = previousKey;
  const create = jest.fn();
  const stub = service as unknown as {
    client: { chat: { completions: { create: jest.Mock } } };
    wait: () => Promise<void>;
  };
  stub.client = { chat: { completions: { create } } };
  stub.wait = async () => undefined;
  return { service, create };
}

const request = { model: 'openai/gpt-4o', messages: [{ role: 'user' as const, content: 'Oi' }] };

function completion(content: string) {
  return {
    choices: [{ message: { content, tool_calls: [] }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 1, completion_tokens: 1 },
  };
}

describe('OpenRouterLlmService.complete', () => {
  it('repete uma falha temporária e devolve a resposta seguinte', async () => {
    const { service, create } = llmWithClient();
    create
      .mockRejectedValueOnce(Object.assign(new Error('rate limit'), { status: 429 }))
      .mockResolvedValueOnce(completion('Olá'));

    const result = await service.complete(request);

    expect(result.content).toBe('Olá');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][1]).toEqual({ timeout: 20_000, maxRetries: 0 });
  });

  it('não repete um erro de pedido inválido', async () => {
    const { service, create } = llmWithClient();
    create.mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));

    await expect(service.complete(request)).rejects.toThrow('bad request');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('desiste depois de três falhas temporárias', async () => {
    const { service, create } = llmWithClient();
    create.mockRejectedValue(Object.assign(new Error('indisponível'), { status: 503 }));

    await expect(service.complete(request)).rejects.toThrow('indisponível');
    expect(create).toHaveBeenCalledTimes(3);
  });
});
