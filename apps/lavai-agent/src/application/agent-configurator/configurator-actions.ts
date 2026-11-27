import type { LlmTool } from '../agent-runner/ports/llm-provider.port';
import type { PromptDocument } from './fill-whatsapp-prompt';
import type { ProposalDraft } from './configurator-blocks';
import { applyContextEdits, type ContextChange } from './context-edits';

export const READ_AGENT_TOOL = 'ler_agente';
export const PROPOSE_TOOL = 'propor_mudanca';

export const ACTIVITY = {
  readAgent: 'Lendo o agente de WhatsApp',
  thinking: 'Analisando o pedido',
  readSheet: 'Lendo a ficha e o prompt do agente',
  propose: 'Preparando o que o agente passa a fazer',
  other: 'Executando uma ação',
} as const;

export type ConfiguratorActivityEvent = {
  type: 'activity';
  id: string;
  label: string;
  status: 'running' | 'done';
};

export function configuratorTools(): LlmTool[] {
  return [
    {
      type: 'function',
      function: {
        name: READ_AGENT_TOOL,
        description: 'Lê a ficha da lavanderia e o prompt atual do agente de WhatsApp.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
      },
    },
    {
      type: 'function',
      function: {
        name: PROPOSE_TOOL,
        description:
          'Prepara uma edição no contexto de negócio, o único texto que você pode mudar. Só chame quando a mudança estiver decidida. Nada é gravado até a pessoa aceitar. Informação ou instrução nova vai em addition. Para corrigir ou remover algo que já está escrito, use replacements. behavior descreve em markdown o que o agente de WhatsApp passa a fazer.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            behavior: { type: 'string' },
            replacements: {
              type: 'array',
              description: 'Trocas pontuais. before é cópia exata de um trecho curto do contexto atual; after é o texto que fica no lugar, vazio só quando a pessoa pediu para remover.',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: { before: { type: 'string' }, after: { type: 'string' } },
                required: ['before', 'after'],
              },
            },
            addition: {
              type: 'string',
              description: 'Texto novo a acrescentar ao contexto. Vazio quando não há nada novo.',
            },
          },
          required: ['behavior', 'replacements', 'addition'],
        },
      },
    },
  ];
}

export function activityLabel(toolName: string): string {
  if (toolName === READ_AGENT_TOOL) return ACTIVITY.readSheet;
  if (toolName === PROPOSE_TOOL) return ACTIVITY.propose;
  return ACTIVITY.other;
}

export function agentSnapshot(facts: string[], persona: PromptDocument): string {
  return [
    'Ficha:',
    facts.length > 0 ? facts.join('\n') : '(sem respostas na ficha)',
    'Regras fixas, somente leitura:',
    `systemPrompt: ${persona.systemPrompt}`,
    `behaviorGuidelines: ${persona.behaviorGuidelines}`,
    `guardrails: ${persona.guardrails}`,
    'Contexto de negócio gravado hoje, único texto editável (entre as marcas):',
    '<<<',
    persona.contextPrompt,
    '>>>',
  ].join('\n');
}

export function runConfiguratorTool(
  name: string,
  rawArguments: string,
  snapshot: string,
  contextPrompt: string,
  alreadyProposed: boolean,
): { content: string; proposal: ProposalDraft | null } {
  if (name === READ_AGENT_TOOL) {
    return { content: snapshot, proposal: null };
  }
  if (name === PROPOSE_TOOL) {
    if (alreadyProposed) {
      return { content: 'Já existe uma proposta neste turno.', proposal: null };
    }
    const request = readEditRequest(rawArguments);
    if (!request) {
      return {
        content: 'Proposta incompleta. Envie behavior, replacements e addition.',
        proposal: null,
      };
    }
    const edited = applyContextEdits(contextPrompt, request);
    if (!edited.ok) {
      return { content: `Proposta recusada. ${edited.reason}`, proposal: null };
    }
    return {
      content: 'Proposta preparada. Nada foi gravado: a pessoa precisa tocar em Aceitar. Diga o que muda e peça para conferir e aceitar.',
      proposal: {
        behavior: request.behavior,
        document: { contextPrompt: edited.context },
        changes: edited.changes,
      },
    };
  }
  return { content: 'Ferramenta desconhecida.', proposal: null };
}

function readEditRequest(
  rawArguments: string,
): { behavior: string; replacements: ContextChange[]; addition: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as Record<string, unknown>;
  if (typeof row.behavior !== 'string' || row.behavior.trim() === '') return null;
  if (!Array.isArray(row.replacements) || typeof row.addition !== 'string') return null;
  const replacements: ContextChange[] = [];
  for (const item of row.replacements as unknown[]) {
    const change = item as Partial<ContextChange> | null;
    if (typeof change?.before !== 'string' || typeof change.after !== 'string') return null;
    replacements.push({ before: change.before, after: change.after });
  }
  return { behavior: row.behavior, replacements, addition: row.addition };
}
