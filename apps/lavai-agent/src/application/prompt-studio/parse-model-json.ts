import type { PromptDocument, PromptField, PromptProposal } from './prompt-studio.types';

const PROMPT_FIELDS: PromptField[] = [
  'contextPrompt',
  'systemPrompt',
  'behaviorGuidelines',
  'guardrails',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function unwrapJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(unwrapJsonFence(raw));
  } catch {
    return null;
  }
}

function parsePromptDocument(value: unknown): PromptDocument | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const document = {} as PromptDocument;

  for (const field of PROMPT_FIELDS) {
    const fieldValue = record[field];
    if (!isNonEmptyString(fieldValue)) {
      return null;
    }
    document[field] = fieldValue.trim();
  }

  return document;
}

export function parseGeneratedDocument(
  raw: string,
): { document: PromptDocument; suggestedQuestions: string[] } | null {
  const parsed = parseJson(raw);
  if (parsed === null || typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const document = parsePromptDocument(record);
  if (document === null) {
    return null;
  }

  const { suggestedQuestions } = record;
  if (!Array.isArray(suggestedQuestions)) {
    return null;
  }

  if (suggestedQuestions.length < 4 || suggestedQuestions.length > 6) {
    return null;
  }

  const questions: string[] = [];
  for (const question of suggestedQuestions) {
    if (!isNonEmptyString(question)) {
      return null;
    }
    questions.push(question.trim());
  }

  return { document, suggestedQuestions: questions };
}

export function parseProposal(raw: string): PromptProposal | null {
  const parsed = parseJson(raw);
  if (parsed === null || typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (!isNonEmptyString(record.summary)) {
    return null;
  }

  const { changes } = record;
  if (changes === null || typeof changes !== 'object' || Array.isArray(changes)) {
    return null;
  }

  const changeRecord = changes as Record<string, unknown>;
  const allowed = new Set<string>(PROMPT_FIELDS);
  const filteredChanges: Partial<PromptDocument> = {};

  for (const [key, value] of Object.entries(changeRecord)) {
    if (!allowed.has(key)) {
      return null;
    }
    if (isNonEmptyString(value)) {
      filteredChanges[key as PromptField] = value.trim();
    }
  }

  if (Object.keys(filteredChanges).length === 0) {
    return null;
  }

  const proposal: PromptProposal = {
    summary: record.summary.trim(),
    changes: filteredChanges,
  };

  if (typeof record.baseUpdatedAt === 'string' && record.baseUpdatedAt.trim() !== '') {
    proposal.baseUpdatedAt = record.baseUpdatedAt.trim();
  }

  if (typeof record.answerKey === 'string' && record.answerKey.trim() !== '') {
    proposal.answerKey = record.answerKey.trim();
  }

  if (typeof record.answerValue === 'string' && record.answerValue.trim() !== '') {
    proposal.answerValue = record.answerValue.trim();
  }

  return proposal;
}
