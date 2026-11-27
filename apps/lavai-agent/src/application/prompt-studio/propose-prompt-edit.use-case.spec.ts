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
  contextPrompt: 'Lavanderia.\nPreço: R$ 20.\nHorário: 8h.',
  systemPrompt: 'Atender',
  behaviorGuidelines: 'Confirme',
  guardrails: 'Não invente',
};
const sheetUpdatedAt = '2026-09-25T10:00:00.000Z';
const input = {
  document,
  question: '',
  answer: '',
  whatWasWrong: 'O preço agora é R$ 25',
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
  currentUpdatedAt: '2026-09-24T00:00:00.000Z',
  draftChanged: false,
  model,
  answers,
  sheetUpdatedAt,
  currentSheetUpdatedAt: sheetUpdatedAt,
};

const priceEdit = {
  summary: 'Atualiza o preço',
  replacements: [{ before: 'R$ 20', after: 'R$ 25' }],
  addition: '',
};

function llmReturning(...replies: unknown[]): LlmProviderPort {
  const complete = jest.fn();
  for (const reply of replies) {
    complete.mockResolvedValueOnce({ content: JSON.stringify(reply), toolCalls: [], finishReason: 'stop' });
  }
  return { complete };
}

describe('ProposePromptEditUseCase', () => {
  it('altera só o contexto de negócio e mantém o resto do texto', async () => {
    const llm = llmReturning(priceEdit);
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result).toEqual({
      summary: 'Atualiza o preço',
      changes: { contextPrompt: 'Lavanderia.\nPreço: R$ 25.\nHorário: 8h.' },
      edits: [{ before: 'R$ 20', after: 'R$ 25' }],
      baseUpdatedAt: input.baseUpdatedAt,
      sheetUpdatedAt,
    });
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it('manda o modelo recusar pedido que exponha dado de outro cliente', async () => {
    const llm = llmReturning(priceEdit);
    await new ProposePromptEditUseCase(llm).execute(input);
    const system = (llm.complete as jest.Mock).mock.calls[0][0].messages[0].content;
    expect(system).toContain('compartilhar dado pessoal de outro cliente');
  });

  it('pede de novo ao modelo quando a edição não se aplica, dizendo o motivo', async () => {
    const llm = llmReturning(
      { ...priceEdit, replacements: [{ before: 'R$ 99', after: 'R$ 25' }] },
      priceEdit,
    );
    const result = await new ProposePromptEditUseCase(llm).execute(input);
    expect(result.changes.contextPrompt).toContain('R$ 25');
    const retry = (llm.complete as jest.Mock).mock.calls[1][0].messages;
    expect(retry.at(-1).content).toContain('não foi encontrado');
  });

  it('recusa reescrita dos outros campos', async () => {
    const rewrite = { summary: 'x', changes: { guardrails: 'outro' } };
    await expect(
      new ProposePromptEditUseCase(llmReturning(rewrite, rewrite)).execute(input),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('recusa quando o valor da ficha não está no contexto novo', async () => {
    const reply = { ...priceEdit, answerKey: 'priceWash', answerValue: 'R$ 30' };
    await expect(
      new ProposePromptEditUseCase(llmReturning(reply, reply)).execute(input),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('recusa proposta sobre texto ou ficha que já mudaram', async () => {
    await expect(
      new ProposePromptEditUseCase(llmReturning(priceEdit)).execute({
        ...input,
        currentUpdatedAt: '2026-09-24T01:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      new ProposePromptEditUseCase(llmReturning(priceEdit)).execute({
        ...input,
        currentSheetUpdatedAt: '2026-09-25T12:00:00.000Z',
      }),
    ).rejects.toThrow('O texto mudou. Peça a alteração de novo.');
  });

  it('ignora facts do cliente e deriva da ficha', async () => {
    const llm = llmReturning(priceEdit);
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
