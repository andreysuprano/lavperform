import { isProposalStale } from './proposal-staleness';

const proposal = {
  summary: 'Ajuste',
  changes: { guardrails: 'Não invente preço' },
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
};

describe('isProposalStale', () => {
  it('fica velha se o updatedAt mudou ou o rascunho mudou', () => {
    expect(isProposalStale(proposal, '2026-09-24T01:00:00.000Z', false)).toBe(true);
    expect(isProposalStale(proposal, proposal.baseUpdatedAt!, true)).toBe(true);
  });

  it('segue válida no mesmo updatedAt e na criação sem base', () => {
    expect(isProposalStale(proposal, proposal.baseUpdatedAt!, false)).toBe(false);
    expect(isProposalStale({ summary: 'A', changes: { systemPrompt: 'B' } }, null, false)).toBe(false);
  });
});
