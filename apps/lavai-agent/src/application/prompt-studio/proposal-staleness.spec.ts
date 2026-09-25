import { isProposalStale } from './proposal-staleness';

const proposal = {
  summary: 'Ajuste',
  changes: { guardrails: 'Não invente preço' },
  baseUpdatedAt: '2026-09-24T00:00:00.000Z',
  sheetUpdatedAt: '2026-09-25T10:00:00.000Z',
};

describe('isProposalStale', () => {
  it('fica velha se o updatedAt mudou ou o rascunho mudou', () => {
    expect(
      isProposalStale(proposal, '2026-09-24T01:00:00.000Z', false, proposal.sheetUpdatedAt),
    ).toBe(true);
    expect(
      isProposalStale(proposal, proposal.baseUpdatedAt!, true, proposal.sheetUpdatedAt),
    ).toBe(true);
  });

  it('fica velha se a ficha mudou', () => {
    expect(
      isProposalStale(
        proposal,
        proposal.baseUpdatedAt!,
        false,
        '2026-09-25T12:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('segue válida no mesmo updatedAt e na criação sem base', () => {
    expect(
      isProposalStale(proposal, proposal.baseUpdatedAt!, false, proposal.sheetUpdatedAt),
    ).toBe(false);
    expect(isProposalStale({ summary: 'A', changes: { systemPrompt: 'B' } }, null, false)).toBe(
      false,
    );
  });
});
