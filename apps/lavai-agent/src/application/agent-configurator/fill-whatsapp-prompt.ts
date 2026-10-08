import { scriptFor, type ServiceModel } from '../prompt-studio/sheet-script';

export type PromptDocument = {
  contextPrompt: string;
  systemPrompt: string;
  behaviorGuidelines: string;
  guardrails: string;
};

const HEADINGS = ['contextPrompt', 'systemPrompt', 'behaviorGuidelines', 'guardrails'] as const;

export class FillPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FillPromptError';
  }
}

export class IncompleteSheetError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(missingKeys.join(','));
    this.name = 'IncompleteSheetError';
    this.missingKeys = missingKeys;
  }
}

export function fillWhatsappPrompt(
  template: string,
  model: ServiceModel,
  answers: Record<string, string>,
): PromptDocument {
  assertTemplate(template);
  const visible = scriptFor(model);
  const missingKeys = visible
    .filter((field) => (answers[field.key] ?? '').trim() === '')
    .map((field) => field.key);
  if (missingKeys.length > 0) {
    throw new IncompleteSheetError(missingKeys);
  }

  const resolved = keepServiceBlock(template, model);
  const sections = splitSections(resolved);
  if (!sections.contextPrompt.includes('{{facts}}')) {
    throw new FillPromptError('Fato da ficha ausente no prompt');
  }

  const lines = visible.map((field) => `- ${field.label}: ${answers[field.key].trim()}`);
  const contextPrompt = sections.contextPrompt.replace('{{facts}}', lines.join('\n'));
  const missingLine = lines.find((line) => !contextPrompt.includes(line));
  if (missingLine) {
    throw new FillPromptError('Fato da ficha ausente no prompt');
  }

  return {
    contextPrompt: contextPrompt.trim(),
    systemPrompt: sections.systemPrompt.trim(),
    behaviorGuidelines: sections.behaviorGuidelines.trim(),
    guardrails: sections.guardrails.trim(),
  };
}

function assertTemplate(template: string): void {
  let cursor = -1;
  for (const heading of HEADINGS) {
    const index = template.indexOf(`# ${heading}`);
    if (index <= cursor) {
      throw new FillPromptError('Prompt padrão inválido');
    }
    cursor = index;
  }
  if (!template.includes('{{facts}}')) {
    throw new FillPromptError('Prompt padrão inválido');
  }
  if (!template.includes('{{#SELF_SERVICE}}') || !template.includes('{{/SELF_SERVICE}}')) {
    throw new FillPromptError('Prompt padrão inválido');
  }
  if (!template.includes('{{#CONVENTIONAL}}') || !template.includes('{{/CONVENTIONAL}}')) {
    throw new FillPromptError('Prompt padrão inválido');
  }
}

function keepServiceBlock(template: string, model: ServiceModel): string {
  const drop = model === 'SELF_SERVICE' ? 'CONVENTIONAL' : 'SELF_SERVICE';
  const keep = model === 'SELF_SERVICE' ? 'SELF_SERVICE' : 'CONVENTIONAL';
  const withoutDrop = template.replace(
    new RegExp(`\\{\\{#${drop}\\}\\}[\\s\\S]*?\\{\\{/${drop}\\}\\}`),
    '',
  );
  return withoutDrop.replace(
    new RegExp(`\\{\\{#${keep}\\}\\}([\\s\\S]*?)\\{\\{/${keep}\\}\\}`),
    '$1',
  );
}

function splitSections(template: string): PromptDocument {
  const sections = {} as PromptDocument;
  for (let index = 0; index < HEADINGS.length; index += 1) {
    const heading = HEADINGS[index];
    const start = template.indexOf(`# ${heading}`);
    const next = index + 1 < HEADINGS.length ? template.indexOf(`# ${HEADINGS[index + 1]}`) : template.length;
    sections[heading] = template.slice(start + `# ${heading}`.length, next);
  }
  return sections;
}
