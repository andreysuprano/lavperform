import type { AgentPersonaData, AgentRepositoryPort } from '../agent/ports/agent.repository.port';
import { factsFromSheet } from '../prompt-studio/sheet-answers';
import type { ServiceModel } from '../prompt-studio/sheet-script';

export const SHEET_FACTS_TITLE = '## Fatos da ficha';

export type SheetFactsInput = {
  serviceModel: ServiceModel;
  answers: Record<string, string>;
};

/** Linha estável de cada resposta preenchida. É o texto que o agente precisa ver. */
export function sheetFactLines(model: ServiceModel, answers: Record<string, string>): string[] {
  return factsFromSheet(model, answers)
    .filter((fact) => fact.text !== '')
    .map((fact) => `- ${fact.label}: ${fact.text}`);
}

/**
 * Garante que cada fato da ficha apareça no contexto, no topo.
 * O que já está escrito fica como está. Não duplica a linha.
 */
export function withSheetFacts(context: string, facts: string[]): { context: string; changed: boolean } {
  const missing = facts.map((fact) => fact.trim()).filter((fact) => fact !== '' && !context.includes(fact));
  if (missing.length === 0) return { context, changed: false };

  const normalized = context.replace(/\r\n/g, '\n');
  const titleAt = normalized.indexOf(SHEET_FACTS_TITLE);
  if (titleAt === -1) {
    const block = [SHEET_FACTS_TITLE, '', ...missing].join('\n');
    const head = normalized.trim();
    return { context: head === '' ? block : `${block}\n\n${head}`, changed: true };
  }

  const afterTitle = titleAt + SHEET_FACTS_TITLE.length;
  const nextHeading = normalized.slice(afterTitle).search(/\n## /);
  const end = nextHeading === -1 ? normalized.length : afterTitle + nextHeading;
  const section = normalized.slice(0, end).trimEnd();
  const rest = normalized.slice(end).trim();
  const next = `${section}\n${missing.join('\n')}`;
  return { context: rest === '' ? next : `${next}\n\n${rest}`, changed: true };
}

export async function persistSheetFacts(
  agents: AgentRepositoryPort,
  agent: { id: string; persona: Pick<AgentPersonaData, 'contextPrompt' | 'updatedAt'> },
  sheet: SheetFactsInput,
): Promise<{ contextPrompt: string; updatedAt: Date; changed: boolean }> {
  const current = agent.persona.contextPrompt ?? '';
  const merged = withSheetFacts(current, sheetFactLines(sheet.serviceModel, sheet.answers));
  if (!merged.changed) {
    return { contextPrompt: current, updatedAt: agent.persona.updatedAt, changed: false };
  }
  const saved = await agents.updatePersona(agent.id, { contextPrompt: merged.context });
  return {
    contextPrompt: saved.contextPrompt ?? merged.context,
    updatedAt: saved.updatedAt,
    changed: true,
  };
}
