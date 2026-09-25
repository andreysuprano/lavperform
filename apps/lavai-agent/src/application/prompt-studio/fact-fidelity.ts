import type { PromptDocument } from './prompt-studio.types';

export function documentKeepsFacts(
  document: PromptDocument,
  facts: Array<{ text: string }>,
): boolean {
  const combined = [
    document.contextPrompt,
    document.systemPrompt,
    document.behaviorGuidelines,
    document.guardrails,
  ].join('\n');

  return facts.every((fact) => {
    const trimmed = fact.text.trim();
    if (trimmed === '') {
      return false;
    }
    return combined.includes(trimmed);
  });
}
