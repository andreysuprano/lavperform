import type { PromptDocument } from './fill-whatsapp-prompt';

export const PRESERVED_TITLE = '## Informações já cadastradas desta lavanderia';

const PRESERVED_INTRO =
  'Use este bloco como fato desta lavanderia. Preço, horário, endereço, passo a passo e regra escritos aqui continuam valendo. A forma de atender segue o foco, as diretrizes e os guardrails. Se duas informações do contexto se contradisserem, não escolha uma: diga que precisa confirmar com um atendente.';

const HEADINGS = ['contextPrompt', 'systemPrompt', 'behaviorGuidelines', 'guardrails'] as const;

const SAVED_HEADINGS: Array<[keyof PromptDocument, string]> = [
  ['systemPrompt', '### Foco que estava salvo'],
  ['behaviorGuidelines', '### Diretrizes que estavam salvas'],
  ['guardrails', '### Guardrails que estavam salvos'],
];

export type PromptBackupPersona = {
  agentId: string;
  companyName: string;
  agentName: string;
  systemPrompt: string;
  behaviorGuidelines: string;
  guardrails: string;
  contextPrompt: string;
};

export function standardConductFromTemplate(template: string): PromptDocument {
  let cursor = -1;
  const starts: number[] = [];
  for (const heading of HEADINGS) {
    const index = template.indexOf(`# ${heading}`);
    if (index <= cursor) {
      throw new Error('Prompt padrão inválido');
    }
    cursor = index;
    starts.push(index);
  }

  const sections = {} as PromptDocument;
  for (let index = 0; index < HEADINGS.length; index += 1) {
    const heading = HEADINGS[index];
    const start = starts[index] + `# ${heading}`.length;
    const end = index + 1 < HEADINGS.length ? starts[index + 1] : template.length;
    sections[heading] = template.slice(start, end).trim();
  }
  if (sections.systemPrompt === '' || sections.behaviorGuidelines === '' || sections.guardrails === '') {
    throw new Error('Prompt padrão inválido');
  }
  return {
    systemPrompt: sections.systemPrompt,
    behaviorGuidelines: sections.behaviorGuidelines,
    guardrails: sections.guardrails,
    contextPrompt: '',
  };
}

export function migratePersonaPrompt(current: PromptDocument, standard: PromptDocument): PromptDocument {
  const next = {
    systemPrompt: standard.systemPrompt.trim(),
    behaviorGuidelines: standard.behaviorGuidelines.trim(),
    guardrails: standard.guardrails.trim(),
  };
  const existing = current.contextPrompt ?? '';
  if (existing.includes(PRESERVED_TITLE)) {
    return { ...next, contextPrompt: existing };
  }
  const block = preservedBlock(current);
  const trimmed = existing.trim();
  return {
    ...next,
    contextPrompt: trimmed === '' ? block : `${trimmed}\n\n${block}`,
  };
}

export function documentFromBackup(row: PromptBackupPersona): PromptDocument {
  return {
    systemPrompt: row.systemPrompt,
    behaviorGuidelines: row.behaviorGuidelines,
    guardrails: row.guardrails,
    contextPrompt: row.contextPrompt,
  };
}

export function missingAgentIds(backupIds: string[], existingIds: string[]): string[] {
  const existing = new Set(existingIds);
  return backupIds.filter((id) => !existing.has(id));
}

function preservedBlock(current: PromptDocument): string {
  const lines = [PRESERVED_TITLE, '', PRESERVED_INTRO];
  for (const [key, heading] of SAVED_HEADINGS) {
    const text = (current[key] ?? '').trim();
    if (text === '') continue;
    lines.push('', heading, '', text);
  }
  return lines.join('\n');
}
