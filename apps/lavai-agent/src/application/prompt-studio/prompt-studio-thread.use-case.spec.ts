import { PromptStudioThreadUseCase } from './prompt-studio-thread.use-case';
import type { PromptStudioThreadRepository } from './prompt-studio-thread.repository.port';

function memoryRepo(): PromptStudioThreadRepository & { rows: Array<{ role: 'USER' | 'SPECIALIST'; content: string; proposalJson: string | null }> } {
  const rows: Array<{ role: 'USER' | 'SPECIALIST'; content: string; proposalJson: string | null }> = [];
  return {
    rows,
    getOrCreate: async () => ({ id: 'thread-1' }),
    listMessages: async () => rows,
    appendMessage: async (message) => { rows.push(message); },
    clearPendingProposal: async () => {
      for (const row of rows) if (row.role === 'SPECIALIST') row.proposalJson = null;
    },
  };
}

describe('PromptStudioThreadUseCase', () => {
  it('grava a unidade e o especialista e discard zera a proposta', async () => {
    const repo = memoryRepo();
    const propose = { execute: jest.fn().mockResolvedValue({ summary: 'Tira o preço', changes: { guardrails: 'Não informe preço' }, baseUpdatedAt: '2026-09-24T00:00:00.000Z' }) };
    const useCase = new PromptStudioThreadUseCase(repo, propose as never);
    const document = { contextPrompt: 'L', systemPrompt: 'A', behaviorGuidelines: 'C', guardrails: 'G' };
    const sent = await useCase.send('agent-1', 'Inventou o preço', document, '2026-09-24T00:00:00.000Z', 'openai/gpt-5');
    expect(sent.proposal.changes.guardrails).toBe('Não informe preço');
    expect(repo.rows.map((row) => row.role)).toEqual(['USER', 'SPECIALIST']);
    await useCase.discard('agent-1');
    expect(repo.rows[1].proposalJson).toBeNull();
  });
});
