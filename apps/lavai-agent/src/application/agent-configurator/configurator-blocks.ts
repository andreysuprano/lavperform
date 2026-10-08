import { FillPromptError } from './fill-whatsapp-prompt';
import type { PromptDocument } from './fill-whatsapp-prompt';

export const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.';
export const CONFIGURATOR_CODE = 'agent-configurator';

export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

export type StoredBlock =
  | { type: 'activity'; label: string }
  | { type: 'markdown'; content: string }
  | {
      type: 'proposal';
      behavior: string;
      document: PromptDocument;
      baseUpdatedAt: string;
    };

export type ClientBlock =
  | { type: 'activity'; label: string }
  | { type: 'markdown'; content: string }
  | { type: 'proposal'; messageId: string; behavior: string; status: ProposalStatus };

export type ProposalDraft = {
  behavior: string;
  document: PromptDocument;
};

export class ConfiguratorReplyError extends Error {
  constructor(message = 'A resposta falhou.') {
    super(message);
    this.name = 'ConfiguratorReplyError';
  }
}

const FIELDS = ['contextPrompt', 'systemPrompt', 'behaviorGuidelines', 'guardrails'] as const;

export function parseConfiguratorReply(raw: string): Array<Omit<Extract<StoredBlock, { type: 'proposal' }>, 'baseUpdatedAt'> | { type: 'markdown'; content: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfiguratorReplyError();
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { blocks?: unknown }).blocks)) {
    throw new ConfiguratorReplyError();
  }
  const blocks = (parsed as { blocks: unknown[] }).blocks;
  const proposals = blocks.filter(
    (block) => !!block && typeof block === 'object' && (block as { type?: string }).type === 'proposal',
  );
  if (proposals.length > 1) {
    throw new ConfiguratorReplyError();
  }
  const markdowns = blocks.filter(
    (block) => !!block && typeof block === 'object' && (block as { type?: string }).type === 'markdown',
  );
  if (markdowns.length === 0) {
    throw new ConfiguratorReplyError();
  }

  return blocks.map((block) => {
    if (!block || typeof block !== 'object') throw new ConfiguratorReplyError();
    const row = block as { type?: string; content?: string; behavior?: string; document?: Partial<PromptDocument> };
    if (row.type === 'markdown') {
      if (typeof row.content !== 'string' || row.content.trim() === '') {
        throw new ConfiguratorReplyError();
      }
      return { type: 'markdown', content: row.content };
    }
    if (row.type === 'proposal') {
      const document = readDocument(row.document);
      if (typeof row.behavior !== 'string' || row.behavior.trim() === '') {
        throw new ConfiguratorReplyError();
      }
      return { type: 'proposal', behavior: row.behavior, document };
    }
    throw new ConfiguratorReplyError();
  });
}

export function stampProposal(
  blocks: ReturnType<typeof parseConfiguratorReply>,
  baseUpdatedAt: string,
): StoredBlock[] {
  return blocks.map((block) =>
    block.type === 'proposal' ? { ...block, baseUpdatedAt } : block,
  );
}

export function toClientBlocks(messageId: string, status: ProposalStatus | null, blocks: StoredBlock[]): ClientBlock[] {
  return blocks.map((block) => {
    if (block.type === 'markdown' || block.type === 'activity') return block;
    return {
      type: 'proposal',
      messageId,
      behavior: block.behavior,
      status: status ?? 'pending',
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
      const parsed = stampProposal(parseConfiguratorReply(json), baseUpdatedAt);
      const blocks = proposal
        ? [
            ...parsed.filter((block) => block.type === 'markdown'),
            { type: 'proposal' as const, behavior: proposal.behavior, document: proposal.document, baseUpdatedAt },
          ]
        : parsed;
      if (!blocks.some((block) => block.type === 'markdown')) {
        throw new ConfiguratorReplyError('O modelo devolveu uma resposta sem texto.');
      }
      return blocks;
    } catch (error) {
      if (proposal) return proposalBlocks(proposal, baseUpdatedAt);
      if (error instanceof ConfiguratorReplyError && error.message !== 'A resposta falhou.') throw error;
      throw new ConfiguratorReplyError('O modelo devolveu um formato inválido.');
    }
  }
  if (text) {
    const blocks: StoredBlock[] = [{ type: 'markdown', content: text }];
    if (proposal) {
      blocks.push({ type: 'proposal', behavior: proposal.behavior, document: proposal.document, baseUpdatedAt });
    }
    return blocks;
  }
  if (proposal) return proposalBlocks(proposal, baseUpdatedAt);
  throw new ConfiguratorReplyError('O modelo devolveu uma resposta vazia.');
}

function proposalBlocks(proposal: ProposalDraft, baseUpdatedAt: string): StoredBlock[] {
  return [
    { type: 'markdown', content: proposal.behavior.trim() },
    { type: 'proposal', behavior: proposal.behavior, document: proposal.document, baseUpdatedAt },
  ];
}

function jsonCandidate(text: string): string | null {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = (fenced?.[1] ?? text).trim();
  return body.startsWith('{') ? body : null;
}

export function decideProposal(input: {
  status: ProposalStatus | null;
  baseUpdatedAt: string;
  currentUpdatedAt: string;
  document: PromptDocument;
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
  for (const field of FIELDS) {
    if (input.document[field].trim() === '') {
      throw new FillPromptError('Proposta incompleta');
    }
  }
  if (input.baseUpdatedAt !== input.currentUpdatedAt) {
    return {
      nextStatus: 'rejected',
      writeDocument: false,
      changed: true,
      message: STALE_MESSAGE,
    };
  }
  return { nextStatus: 'accepted', writeDocument: true, changed: true };
}

function readDocument(document: Partial<PromptDocument> | undefined): PromptDocument {
  if (!document) throw new ConfiguratorReplyError();
  const result = {} as PromptDocument;
  for (const field of FIELDS) {
    const value = document[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ConfiguratorReplyError();
    }
    result[field] = value;
  }
  return result;
}
