import type { PromptProposal } from './prompt-studio.types';

export function isProposalStale(
  proposal: PromptProposal,
  currentUpdatedAt: string | null,
  draftChanged: boolean,
  currentSheetUpdatedAt?: string | null,
): boolean {
  if (draftChanged) return true;
  if (proposal.baseUpdatedAt && proposal.baseUpdatedAt !== currentUpdatedAt) {
    return true;
  }
  if (
    proposal.sheetUpdatedAt != null &&
    proposal.sheetUpdatedAt !== currentSheetUpdatedAt
  ) {
    return true;
  }
  return false;
}
