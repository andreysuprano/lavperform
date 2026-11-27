import { applyContextEdits, type ContextChange } from './context-edits';

export type DirectContextInstruction = {
  replacements: ContextChange[];
  addition: string;
  confirmationMessage: string;
  writesContext: boolean;
};

const INFORMATIVE_HINT =
  /\b(R\$|horário|horario|até\s+às|até\s+as|endereço|endereco|whatsapp|telefone|funcionamento|preço|preco|cobertor|edredom|lavagem|plano|entrega|retirada|sábado|sabado|domingo|feriado|atendimento)\b/i;

/** Pergunta pura — não grava no envio. */
export function isConfiguratorQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return true;
  if (/deve\s+ser\s*:/i.test(trimmed)) return false;
  if (/R\$\s*[\d.,]+/.test(trimmed) && trimmed.length > 30) return false;
  if (INFORMATIVE_HINT.test(trimmed) && trimmed.length > 48 && !/^(qual|como|onde)\s+/i.test(trimmed)) {
    return false;
  }
  if (/^(qual|onde|como|quando|quem|o que|está correto|confirma)\b/i.test(trimmed)) return true;
  if (trimmed.endsWith('?') && trimmed.length < 120) return true;
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
  const trimmed = userText.trim();

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

  const add = userText.match(
    /(?:adicione|grave|coloque|inclua|salve|registre)\s+(?:no\s+)?contexto\s*[-:]\s*([\s\S]+)/i,
  );
  if (add) {
    const value = add[1].trim();
    if (value === '') return null;
    return buildInstruction('Instrução', value, contextPrompt, (v) => v);
  }

  const priceLines = extractPriceFactLines(userText);
  if (priceLines.length > 0) {
    const body = priceLines.join('\n');
    return buildInstruction('Preços e serviços', body, contextPrompt, (lines) =>
      ['### Preços e serviços (confirmados pela lavanderia)', '', lines].join('\n'),
    );
  }

  if (isConfiguratorQuestion(trimmed)) return null;

  return tryAutoPersistInformativeMessage(trimmed, contextPrompt);
}

/** Texto informativo no chat (horário, regra, texto longo) — grava sem comando mágico. */
export function tryAutoPersistInformativeMessage(
  text: string,
  contextPrompt: string,
): DirectContextInstruction | null {
  const trimmed = text.trim();
  if (trimmed.length < 28) return null;
  if (/^(oi|olá|ola|obrigad|valeu|tchau|bom dia|boa tarde|boa noite)\b/i.test(trimmed)) return null;
  if (/tudo\s+o\s+que\s+conversamos|salv(e|ar)\s+tudo|copie\s+e\s+salv/i.test(trimmed)) return null;

  const substantive = INFORMATIVE_HINT.test(trimmed) || trimmed.length >= 72;
  if (!substantive) return null;

  return buildInstruction('Instruções da lavanderia', trimmed, contextPrompt, (body) =>
    ['### O que a lavanderia informou no configurador', '', body].join('\n'),
  );
}

/** Blocos com R$ no texto do usuário (ex.: cobertor solteiro R$ 40). */
export function extractPriceFactLines(userText: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  const push = (rawLabel: string, priceRaw: string) => {
    let label = rawLabel.replace(/\s+/g, ' ').trim();
    label = label.replace(/^(?:o\s+)?valor\s+para\s+lavar\s+/i, '');
    label = label.replace(/\s+o valor para lavar\s*$/i, '');
    label = label.replace(/^(?:também\s+)?(?:é|e)\s+/i, '');
    label = label.replace(/^(?:o\s+)?valor\s*$/i, '');
    if (label.length < 4 || /^(qual|quanto|como)\b/i.test(label)) return;
    const price = priceRaw.replace(/\s/g, '');
    const line = `- Lavagem ${label}: R$ ${price}`;
    const key = `${label.toLowerCase()}|${price}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(line);
  };

  const afterQuestion =
    /(?:qual\s+(?:o\s+)?valor\s+(?:do|da|de)\s*)([^?]{4,80})\?\s*[\s\S]{0,120}?R\$\s*([\d.,]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = afterQuestion.exec(userText)) !== null) {
    push(match[1], match[2]);
  }

  const pattern = /([^?\n]{8,120}?)\s+(?:é\s+de\s+|de\s+)?R\$\s*([\d.,]+)/gi;
  while ((match = pattern.exec(userText)) !== null) {
    push(match[1], match[2]);
  }

  return lines;
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