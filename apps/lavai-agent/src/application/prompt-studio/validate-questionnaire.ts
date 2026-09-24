import { DO_NOT_INVENT, type QuestionnaireAnswers } from './prompt-studio.types';

export { DO_NOT_INVENT };

type RequiredField = 'services' | 'focus' | 'mustNotPromise';

const REQUIRED_FIELDS: RequiredField[] = ['services', 'focus', 'mustNotPromise'];

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

function normalizeOptional(value: string | undefined): string {
  return isBlank(value) ? DO_NOT_INVENT : value!.trim();
}

export function validateQuestionnaire(
  answers: QuestionnaireAnswers,
): { ok: true; normalized: QuestionnaireAnswers } | { ok: false; missing: RequiredField[] } {
  const missing: RequiredField[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (isBlank(answers[field])) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const normalized: QuestionnaireAnswers = {
    ...answers,
    services: answers.services.trim(),
    focus: answers.focus.trim(),
    mustNotPromise: answers.mustNotPromise.trim(),
    hoursAndDeadline: normalizeOptional(answers.hoursAndDeadline),
    pricing: normalizeOptional(answers.pricing),
    handoff: normalizeOptional(answers.handoff),
  };

  return { ok: true, normalized };
}
