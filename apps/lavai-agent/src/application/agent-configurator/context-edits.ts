import { PRESERVED_TITLE } from './migrate-persona-prompt';

export const INSTRUCTIONS_TITLE = '## Instruções da lavanderia';

/** Trocas grandes deixariam o modelo reescrever o contexto e perder informação. */
const MAX_LINES_PER_REPLACEMENT = 12;

export type ContextChange = { before: string; after: string };

export type ContextEditResult =
  | { ok: true; context: string; changes: ContextChange[] }
  | { ok: false; reason: string };

/**
 * Aplica edições pontuais no contexto de negócio. Tudo o que não estiver numa
 * troca fica exatamente como estava.
 */
export function applyContextEdits(
  context: string,
  input: { replacements: ContextChange[]; addition: string },
): ContextEditResult {
  let next = normalize(context);
  const changes: ContextChange[] = [];

  for (const replacement of input.replacements) {
    const before = normalize(replacement.before);
    const after = normalize(replacement.after);
    if (before.trim() === '') return fail('Cada troca precisa do trecho atual em before.');
    if (before === after) continue;
    if (before.split('\n').length > MAX_LINES_PER_REPLACEMENT) {
      return fail(`Troque em trechos menores, de no máximo ${MAX_LINES_PER_REPLACEMENT} linhas.`);
    }
    const start = next.indexOf(before);
    if (start === -1) {
      return fail(`O trecho não foi encontrado no contexto. Copie exatamente como está: "${before}"`);
    }
    if (next.indexOf(before, start + 1) !== -1) {
      return fail(`O trecho aparece mais de uma vez. Mande um trecho maior: "${before}"`);
    }
    next = next.slice(0, start) + after + next.slice(start + before.length);
    changes.push({ before, after });
  }

  const addition = normalize(input.addition).trim();
  if (addition !== '' && !next.includes(addition)) {
    next = addInstruction(next, addition);
    changes.push({ before: '', after: addition });
  }

  if (changes.length === 0) return fail('Nada mudaria no contexto: isso já está escrito ou a edição veio vazia.');
  if (next.trim() === '') return fail('O contexto de negócio não pode ficar vazio.');
  return { ok: true, context: next, changes };
}

function addInstruction(context: string, addition: string): string {
  const title = context.indexOf(INSTRUCTIONS_TITLE);
  if (title !== -1) {
    const afterTitle = title + INSTRUCTIONS_TITLE.length;
    const nextHeading = context.slice(afterTitle).search(/\n##? /);
    const end = nextHeading === -1 ? context.length : afterTitle + nextHeading;
    return join(`${context.slice(0, end).trimEnd()}\n${addition}`, context.slice(end));
  }
  const preserved = context.indexOf(PRESERVED_TITLE);
  const end = preserved === -1 ? context.length : preserved;
  const section = `${INSTRUCTIONS_TITLE}\n\n${addition}`;
  const head = context.slice(0, end).trimEnd();
  return join(head === '' ? section : `${head}\n\n${section}`, context.slice(end));
}

function join(head: string, tail: string): string {
  const rest = tail.trim();
  return rest === '' ? head : `${head}\n\n${rest}`;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function fail(reason: string): ContextEditResult {
  return { ok: false, reason };
}
