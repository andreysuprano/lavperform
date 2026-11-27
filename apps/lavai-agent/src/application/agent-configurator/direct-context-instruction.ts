import { applyContextEdits, type ContextChange } from './context-edits';

export type DirectContextInstruction = {
  replacements: ContextChange[];
  addition: string;
  confirmationMessage: string;
  writesContext: boolean;
};

/** Pergunta pura — não grava no envio. */
export function isConfiguratorQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return true;
  if (/deve\s+ser\s*:/i.test(trimmed)) return false;
  if (/^(qual|onde|como|quando|quem|o que|está correto|confirma)\b/i.test(trimmed)) return true;
  if (trimmed.endsWith('?')) return true;
  return false;
}

/**
 * Instrução explícita no chat (ex.: "A saudação de abertura deve ser: …").
 * Grava no envio, sem depender do modelo chamar propor_mudanca.
 */
export function tryDirectContextInstruction(
  userText: string,
  contextPrompt: string,
): DirectContextInstruction | null {
  if (isConfiguratorQuestion(userText)) return null;

  const greeting = userText.match(/sauda[cç][aã]o\s+de\s+abertura\s+deve\s+ser\s*:\s*([\s\S]+)/i);
  if (greeting) {
    const value = greeting[1].trim();
    if (value === '') return null;
    return buildInstruction('Saudação de abertura', value, contextPrompt, (v) =>
      [
        '### Saudação de abertura',
        'Na primeira resposta da conversa, use exatamente esta mensagem:',
        '',
        v,
      ].join('\n'),
    );
  }

  const labeled = userText.match(/^(.{8,140}?)\s+deve\s+ser\s*:\s*([\s\S]+)$/im);
  if (labeled) {
    const label = labeled[1].trim();
    const value = labeled[2].trim();
    if (value === '') return null;
    return buildInstruction(label, value, contextPrompt, (v) =>
      [`### ${label}`, '', v].join('\n'),
    );
  }

  const add = userText.match(/(?:adicione|grave|coloque|inclua)\s+(?:no\s+)?contexto\s*:\s*([\s\S]+)/i);
  if (add) {
    const value = add[1].trim();
    if (value === '') return null;
    return buildInstruction('Instrução', value, contextPrompt, (v) => v);
  }

  return null;
}

function buildInstruction(
  label: string,
  value: string,
  contextPrompt: string,
  formatAddition: (value: string) => string,
): DirectContextInstruction | null {
  const addition = formatAddition(value);
  const preview = applyContextEdits(contextPrompt, { replacements: [], addition });
  if (!preview.ok) return null;

  const already =
    contextPrompt.includes(value) ||
    (preview.changes.length === 0 && contextPrompt.trim() !== '' && contextPrompt.includes(addition));
  const confirmationMessage = already
    ? `Esse texto já estava no contexto do agente. Se o **Testar** não refletir, abra uma conversa nova.`
    : `**Gravei** no contexto do agente (*${label}*). Já vale no **Testar**.`;

  return {
    replacements: [],
    addition,
    confirmationMessage,
    writesContext: !already,
  };
}