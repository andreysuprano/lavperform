import type { PromptDocument, PromptEditRequest, PromptField } from './prompt-studio.types';

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

export function parseProposal(raw: string): PromptEditRequest | null {
  const parsed = parseJson(raw);
  if (parsed === null || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  if (!isNonEmptyString(record.summary)) {
    return null;
  }
  if (!Array.isArray(record.replacements) || typeof record.addition !== 'string') {
    return null;
  }

  const replacements: PromptEditRequest['replacements'] = [];
  for (const item of record.replacements as unknown[]) {
    const change = item as { before?: unknown; after?: unknown } | null;
    if (typeof change?.before !== 'string' || typeof change.after !== 'string') {
      return null;
    }
    replacements.push({ before: change.before, after: change.after });
  }

  const request: PromptEditRequest = {
    summary: record.summary.trim(),
    replacements,
    addition: record.addition,
  };

  if (isNonEmptyString(record.answerKey)) {
    request.answerKey = record.answerKey.trim();
  }

  if (isNonEmptyString(record.answerValue)) {
    request.answerValue = record.answerValue.trim();
  }

  return request;
}
