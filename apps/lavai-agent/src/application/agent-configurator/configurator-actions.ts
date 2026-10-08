import type { LlmTool } from '../agent-runner/ports/llm-provider.port';
import type { PromptDocument } from './fill-whatsapp-prompt';
import type { ProposalDraft } from './configurator-blocks';

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

const FIELDS = ['contextPrompt', 'systemPrompt', 'behaviorGuidelines', 'guardrails'] as const;

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
          'Só chame quando a mudança estiver decidida e não restar dúvida que impeça de escrever os quatro campos. Se faltar fato ou o pedido for vago, não chame: a resposta deve perguntar. behavior descreve o que o agente de WhatsApp passa a fazer, em markdown, sem colar o prompt. Os quatro campos precisam ter texto.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            behavior: { type: 'string' },
            contextPrompt: { type: 'string' },
            systemPrompt: { type: 'string' },
            behaviorGuidelines: { type: 'string' },
            guardrails: { type: 'string' },
          },
          required: ['behavior', 'contextPrompt', 'systemPrompt', 'behaviorGuidelines', 'guardrails'],
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
    'Prompt atual:',
    `contextPrompt: ${persona.contextPrompt}`,
    `systemPrompt: ${persona.systemPrompt}`,
    `behaviorGuidelines: ${persona.behaviorGuidelines}`,
    `guardrails: ${persona.guardrails}`,
  ].join('\n');
}

export function runConfiguratorTool(
  name: string,
  rawArguments: string,
  snapshot: string,
  alreadyProposed: boolean,
): { content: string; proposal: ProposalDraft | null } {
  if (name === READ_AGENT_TOOL) {
    return { content: snapshot, proposal: null };
  }
  if (name === PROPOSE_TOOL) {
    if (alreadyProposed) {
      return { content: 'Já existe uma proposta neste turno.', proposal: null };
    }
    const proposal = readProposal(rawArguments);
    if (!proposal) {
      return {
        content: 'Proposta incompleta. Envie behavior e os quatro campos com texto.',
        proposal: null,
      };
    }
    return {
      content: 'Proposta registrada. Responda sobre o que a pessoa pediu e diga o que muda. Não repita uma frase genérica e não mostre o prompt.',
      proposal,
    };
  }
  return { content: 'Ferramenta desconhecida.', proposal: null };
}

function readProposal(rawArguments: string): ProposalDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as Record<string, unknown>;
  if (typeof row.behavior !== 'string' || row.behavior.trim() === '') return null;
  const document = {} as PromptDocument;
  for (const field of FIELDS) {
    const value = row[field];
    if (typeof value !== 'string' || value.trim() === '') return null;
    document[field] = value;
  }
  return { behavior: row.behavior, document };
}
