import { FillPromptError } from './fill-whatsapp-prompt';
import type { PromptDocument } from './fill-whatsapp-prompt';
import type { ContextChange } from './context-edits';

export const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';
export const CONFIGURATOR_CODE = 'agent-configurator';
export const NOTHING_CHANGED_MESSAGE = 'Nenhuma alteração foi preparada, então nada mudou no agente. Peça de novo.';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

type ContextDocument = Pick<PromptDocument, 'contextPrompt'>;

export type StoredBlock =
  | { type: 'activity'; label: string }
  | { type: 'markdown'; content: string }
  | {
      type: 'proposal';
      behavior: string;
      document: ContextDocument;
      /** Ausente nas propostas antigas, que reescreviam os quatro campos. */
      changes?: ContextChange[];
      baseUpdatedAt: string;
    };

export type ClientBlock =
  | { type: 'activity'; label: string }
  | { type: 'markdown'; content: string }
  | { type: 'proposal'; messageId: string; behavior: string; status: ProposalStatus; changes: ContextChange[] };

export type ProposalDraft = {
  behavior: string;
  document: ContextDocument;
  changes: ContextChange[];
};

export class ConfiguratorReplyError extends Error {
  constructor(message = 'A resposta falhou.') {
    super(message);
    this.name = 'ConfiguratorReplyError';
  }
}

/** Proposta escrita no texto da resposta é ignorada: só a ferramenta propõe mudança. */
export function parseConfiguratorReply(raw: string): Array<{ type: 'markdown'; content: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfiguratorReplyError();
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { blocks?: unknown }).blocks)) {
    throw new ConfiguratorReplyError();
  }
  const markdowns: Array<{ type: 'markdown'; content: string }> = [];
  for (const block of (parsed as { blocks: unknown[] }).blocks) {
    const row = block as { type?: string; content?: unknown } | null;
    if (row?.type !== 'markdown') continue;
    if (typeof row.content !== 'string' || row.content.trim() === '') {
      throw new ConfiguratorReplyError();
    }
    markdowns.push({ type: 'markdown', content: row.content });
  }
  if (markdowns.length === 0) {
    throw new ConfiguratorReplyError();
  }
  return markdowns;
}

export function toClientBlocks(messageId: string, status: ProposalStatus | null, blocks: StoredBlock[]): ClientBlock[] {
  return blocks.map((block) => {
    if (block.type === 'markdown' || block.type === 'activity') return block;
    return {
      type: 'proposal',
      messageId,
      behavior: block.behavior,
      status: status ?? 'pending',
      changes: block.changes ?? [],
    };
  });
}

export function joinedMarkdown(blocks: Array<{ type: string; content?: string; behavior?: string }>): string {
  return blocks
    .map((block) => {
      if (block.type === 'activity') return '';
      return (block.type === 'markdown' ? block.content : block.behavior) ?? '';
    })
    .filter((text) => text.trim() !== '')
    .join('\n\n');
}

export function finalizeConfiguratorReply(
  content: string | null,
  proposal: ProposalDraft | null,
  baseUpdatedAt: string,
): StoredBlock[] {
  const text = content?.trim() ?? '';
  const json = jsonCandidate(text);
  if (json) {
    try {
      const markdowns = parseConfiguratorReply(json);
      return proposal ? [...markdowns, proposalBlock(proposal, baseUpdatedAt)] : markdowns;
    } catch {
      if (proposal) return proposalBlocks(proposal, baseUpdatedAt);
      throw new ConfiguratorReplyError('O modelo devolveu um formato inválido.');
    }
  }
  if (text) {
    const blocks: StoredBlock[] = [{ type: 'markdown', content: text }];
    if (proposal) {
      blocks.push(proposalBlock(proposal, baseUpdatedAt));
    }
    return blocks;
  }
  if (proposal) return proposalBlocks(proposal, baseUpdatedAt);
  throw new ConfiguratorReplyError('O modelo devolveu uma resposta vazia.');
}

function proposalBlocks(proposal: ProposalDraft, baseUpdatedAt: string): StoredBlock[] {
  return [
    { type: 'markdown', content: proposal.behavior.trim() },
    proposalBlock(proposal, baseUpdatedAt),
  ];
}

function proposalBlock(proposal: ProposalDraft, baseUpdatedAt: string): StoredBlock {
  return { type: 'proposal', ...proposal, baseUpdatedAt };
}

function jsonCandidate(text: string): string | null {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = (fenced?.[1] ?? text).trim();
  return body.startsWith('{') ? body : null;
}

export function instructionsWithSummary(document: PromptDocument, _summary: string): PromptDocument {
  return document;
}

export function decideProposal(input: {
  status: ProposalStatus | null;
  baseUpdatedAt: string;
  currentUpdatedAt: string;
  document: ContextDocument;
  changes?: ContextChange[];
  action: 'accept' | 'reject';
}): { nextStatus: ProposalStatus; writeDocument: boolean; message?: string; changed: boolean } {
  if (input.status !== 'pending') {
    return {
      nextStatus: input.status ?? 'rejected',
      writeDocument: false,
      changed: false,
    };
  }
  if (input.action === 'reject') {
    return { nextStatus: 'rejected', writeDocument: false, changed: true };
  }
  if (input.changes && input.document.contextPrompt.trim() === '') {
    throw new FillPromptError('Proposta incompleta');
  }
  if (!input.changes || input.baseUpdatedAt !== input.currentUpdatedAt) {
    return {
      nextStatus: 'rejected',
      writeDocument: false,
      changed: true,
      message: STALE_MESSAGE,
    };
  }
  return { nextStatus: 'accepted', writeDocument: true, changed: true };
}
