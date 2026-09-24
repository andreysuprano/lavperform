import type { PromptProposal } from './prompt-studio.types';

export function isProposalStale(
  proposal: PromptProposal,
  currentUpdatedAt: string | null,
  draftChanged: boolean,
): boolean {
  if (draftChanged) return true;
  if (!proposal.baseUpdatedAt) return false;
  return proposal.baseUpdatedAt !== currentUpdatedAt;
}
