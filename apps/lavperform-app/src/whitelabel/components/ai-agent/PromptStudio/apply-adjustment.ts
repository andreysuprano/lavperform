import type { PromptDocument, PromptProposal } from '@/whitelabel/types'

/** O chat de ajuste só altera o contexto de negócio; o resto do prompt é fixo. */
export function applyAdjustment(
  document: PromptDocument,
  proposal: PromptProposal
): PromptDocument {
  const contextPrompt = proposal.changes.contextPrompt
  if (!contextPrompt) {
    throw new Error('O texto mudou. Peça a alteração de novo.')
  }
  return { ...document, contextPrompt }
}
