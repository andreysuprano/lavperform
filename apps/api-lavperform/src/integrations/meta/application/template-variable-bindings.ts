import {
  countTemplateVariables,
  META_TEMPLATE_VARIABLE_SOURCE,
} from './meta-template-variables.utils';

const TOKEN_RE = /\{\{([^{}]*)\}\}/g;
const VALID_KEY = /^[a-z][a-z0-9_]*$/;
const DIGITS_ONLY = /^\d+$/;
const KNOWN_SOURCES = new Set<string>(Object.values(META_TEMPLATE_VARIABLE_SOURCE));
const CATALOG_SOURCE_LABEL: Record<string, string> = {
  primeiro_nome: 'primeiro nome',
  nome_cliente: 'nome do cliente',
  dias_sem_venda: 'dias desde a última venda',
  nome_loja: 'nome da loja',
};

export class TemplateVariableBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateVariableBindingError';
  }
}

export type TemplateVariableCatalogEntry = {
  key: string;
  source: string;
  example: string;
};

export const TEMPLATE_VARIABLE_CATALOG: TemplateVariableCatalogEntry[] = [
  { key: 'primeiro_nome', source: 'customer_first_name', example: 'Maria' },
  { key: 'nome_cliente', source: 'customer_name', example: 'Maria Silva' },
  { key: 'dias_sem_venda', source: 'days_since_last_order', example: '15' },
  { key: 'nome_loja', source: 'store_name', example: 'Minha Loja' },
];

const CATALOG_BY_KEY = new Map(
  TEMPLATE_VARIABLE_CATALOG.map((entry) => [entry.key, entry]),
);

export type TemplateVariableBinding = { index: number; key: string };

export type TemplateVariableBindings = {
  bindings: TemplateVariableBinding[];
  metaSlots?: { header: number[]; body: number[] };
};

export function sourceForTemplateKey(key: string): string | null {
  return CATALOG_BY_KEY.get(key)?.source ?? null;
}

function missingOriginMessage(index: number): string {
  return `Informe a origem dos dados para a variável {{${index}}}`;
}

export function assertTemplateVariableMappings(input: {
  applicable: boolean;
  bindings: { index: number; key: string }[];
  legacyIndexes: number[];
  mappings: { index: number; source: string }[];
}): void {
  const byIndex = new Map(input.mappings.map((mapping) => [mapping.index, mapping]));

  if (!input.applicable) {
    for (const index of input.legacyIndexes) {
      const mapping = byIndex.get(index);
      if (!mapping || !KNOWN_SOURCES.has(mapping.source)) {
        throw new TemplateVariableBindingError(missingOriginMessage(index));
      }
    }
    return;
  }

  for (const binding of input.bindings) {
    const mapping = byIndex.get(binding.index);
    const expected = sourceForTemplateKey(binding.key);
    if (expected) {
      if (!mapping) {
        throw new TemplateVariableBindingError(missingOriginMessage(binding.index));
      }
      if (mapping.source !== expected) {
        const label = CATALOG_SOURCE_LABEL[binding.key] ?? expected;
        throw new TemplateVariableBindingError(
          `A variável {{${binding.key}}} usa o ${label}.`,
        );
      }
      continue;
    }
    if (!mapping || !KNOWN_SOURCES.has(mapping.source)) {
      throw new TemplateVariableBindingError(missingOriginMessage(binding.index));
    }
  }
}

function assign(
  key: string,
  bindings: TemplateVariableBinding[],
): TemplateVariableBinding {
  const existing = bindings.find((item) => item.key === key);
  if (existing) return existing;
  const item = { index: bindings.length + 1, key };
  bindings.push(item);
  return item;
}

function eachToken(
  text: string,
  visitor: (key: string, match: string) => string,
): string {
  return text.replace(new RegExp(TOKEN_RE.source, 'g'), (match, inner: string) =>
    visitor(inner.trim(), match),
  );
}

function hasAnyToken(text: string): boolean {
  return new RegExp(TOKEN_RE.source).test(text);
}

function tokenCount(text: string): number {
  return [...text.matchAll(new RegExp(TOKEN_RE.source, 'g'))].length;
}

function positionalNumbers(text: string): number[] | null {
  const numbers: number[] = [];
  const matches = text.matchAll(new RegExp(TOKEN_RE.source, 'g'));
  for (const match of matches) {
    const key = match[1].trim();
    if (!DIGITS_ONLY.test(key)) return null;
    numbers.push(Number(key));
  }
  return numbers;
}

function translateNamedToLocal(
  text: string,
  bindings: TemplateVariableBinding[],
  slotList: number[],
): string {
  const localByGlobal = new Map<number, number>();
  return eachToken(text, (key) => {
    if (!VALID_KEY.test(key)) {
      throw new TemplateVariableBindingError(
        'Use uma sugestão ou um nome no formato {{chave}}.',
      );
    }
    const item = assign(key, bindings);
    let local = localByGlobal.get(item.index);
    if (local === undefined) {
      local = localByGlobal.size + 1;
      localByGlobal.set(item.index, local);
      slotList.push(item.index);
    }
    return `{{${local}}}`;
  });
}

function translateNamedToGlobal(
  text: string,
  bindings: TemplateVariableBinding[],
): string {
  return eachToken(text, (key) => {
    if (!VALID_KEY.test(key)) {
      throw new TemplateVariableBindingError(
        'Use uma sugestão ou um nome no formato {{chave}}.',
      );
    }
    const item = assign(key, bindings);
    return `{{${item.index}}}`;
  });
}

export function translateMetaCustomerTexts(input: {
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  buttonUrls?: string[];
}): {
  headerText: string | undefined;
  bodyText: string | undefined;
  bindings: TemplateVariableBindings | null;
} {
  const headerText = input.headerText ?? '';
  const bodyText = input.bodyText ?? '';
  const footerText = input.footerText ?? '';

  if (hasAnyToken(footerText)) {
    throw new TemplateVariableBindingError('O rodapé não aceita variável.');
  }

  for (const url of input.buttonUrls ?? []) {
    eachToken(url, (key, match) => {
      if (!DIGITS_ONLY.test(key)) {
        throw new TemplateVariableBindingError(
          'O link do botão não aceita nome de variável. O {{1}} desse link é o código do clique.',
        );
      }
      return match;
    });
  }

  if (tokenCount(headerText) > 1) {
    throw new TemplateVariableBindingError('O título aceita uma variável só.');
  }

  const bindings: TemplateVariableBinding[] = [];
  const headerSlots: number[] = [];
  const bodySlots: number[] = [];
  const translatedHeader = translateNamedToLocal(headerText, bindings, headerSlots);
  const translatedBody = translateNamedToLocal(bodyText, bindings, bodySlots);

  if (translatedBody.length > 1024) {
    throw new TemplateVariableBindingError(
      'O corpo da mensagem pode ter no máximo 1024 caracteres.',
    );
  }

  if (bindings.length === 0) {
    return {
      headerText: input.headerText,
      bodyText: input.bodyText,
      bindings: null,
    };
  }

  return {
    headerText: translatedHeader,
    bodyText: translatedBody,
    bindings: {
      bindings,
      metaSlots: { header: headerSlots, body: bodySlots },
    },
  };
}

export function resolveMetaExamples(input: {
  bindings: TemplateVariableBindings | null | undefined;
  headerExample?: string;
  bodyExamples?: string[];
}): { headerExample: string; bodyExamples: string[] } {
  const bindings = input.bindings;
  if (!bindings) {
    return {
      headerExample: input.headerExample ?? '',
      bodyExamples: input.bodyExamples ?? [],
    };
  }

  const keyByIndex = new Map(bindings.bindings.map((item) => [item.index, item.key]));
  const slots = bindings.metaSlots ?? { header: [], body: [] };

  const fill = (globalIndex: number, provided: string | undefined): string => {
    const trimmed = (provided ?? '').trim();
    if (trimmed !== '') return trimmed;
    const key = keyByIndex.get(globalIndex);
    if (key && sourceForTemplateKey(key)) {
      return CATALOG_BY_KEY.get(key)?.example ?? '';
    }
    throw new TemplateVariableBindingError('Cada variável precisa de um exemplo.');
  };

  const headerExample =
    slots.header.length > 0
      ? fill(slots.header[0], input.headerExample)
      : (input.headerExample ?? '');

  const providedBody = input.bodyExamples ?? [];
  const bodyExamples = slots.body.map((globalIndex, position) =>
    fill(globalIndex, providedBody[position]),
  );

  return { headerExample, bodyExamples };
}

function cloneJson<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function assertNoRcsActionTokens(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(assertNoRcsActionTokens);
    return;
  }
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.actions)) {
    for (const action of obj.actions) {
      if (!action || typeof action !== 'object') continue;
      const url = (action as Record<string, unknown>).url;
      if (typeof url === 'string' && hasAnyToken(url)) {
        throw new TemplateVariableBindingError(
          'O link do botão RCS não aceita variável.',
        );
      }
    }
  }
  for (const nested of Object.values(obj)) {
    if (nested && typeof nested === 'object') assertNoRcsActionTokens(nested);
  }
}

function translateRcsField(
  obj: Record<string, unknown>,
  field: string,
  bindings: TemplateVariableBinding[],
): void {
  if (typeof obj[field] === 'string') {
    obj[field] = translateNamedToGlobal(obj[field] as string, bindings);
  }
}

function assertStaticRcsField(
  obj: Record<string, unknown>,
  field: string,
  message: string,
): void {
  if (typeof obj[field] === 'string' && hasAnyToken(obj[field])) {
    throw new TemplateVariableBindingError(message);
  }
}

/** O rodapé do card é o subtítulo da Disparo Pro e não aceita variável. */
export function assertRcsCardHasNoSubtitleVariables(
  content: Record<string, unknown>,
): void {
  assertStaticRcsField(
    content,
    'footer',
    'O rodapé do card não aceita variáveis.',
  );
}

export function assertRcsCarouselContent(content: Record<string, unknown>): void {
  const cards = Array.isArray(content.cards) ? content.cards : [];
  if (cards.length < 2) {
    throw new TemplateVariableBindingError(
      'O carrossel precisa de pelo menos 2 cards.',
    );
  }
  if (cards.length > 10) {
    throw new TemplateVariableBindingError('O carrossel aceita no máximo 10 cards.');
  }

  cards.forEach((card, index) => {
    const record = (card ?? {}) as Record<string, unknown>;
    const number = index + 1;
    const title = typeof record.title === 'string' ? record.title : '';
    const body = typeof record.body === 'string' ? record.body : '';
    if (!body.trim()) {
      throw new TemplateVariableBindingError(`Informe o texto do card ${number}.`);
    }
    const media = record.media;
    const hasMedia =
      (typeof media === 'string' && media.trim().length > 0) ||
      (Array.isArray(media) && media.some((item) => String(item ?? '').trim()));
    if (!hasMedia) {
      throw new TemplateVariableBindingError(
        `O card ${number} do carrossel precisa de uma imagem.`,
      );
    }
    if (title.length + body.length > 160) {
      throw new TemplateVariableBindingError(
        `No card ${number}, título e texto juntos podem ter no máximo 160 caracteres.`,
      );
    }
  });
}

export function translateRcsContent(input: {
  contentType: 'text' | 'media' | 'card' | 'carousel';
  content: Record<string, unknown> | unknown;
}): {
  content: Record<string, unknown>;
  bindings: TemplateVariableBindings | null;
  variables: string[];
} {
  const content = cloneJson(input.content) as Record<string, unknown>;
  assertNoRcsActionTokens(content);

  const bindings: TemplateVariableBinding[] = [];

  if (input.contentType === 'text' || input.contentType === 'media') {
    translateRcsField(content, 'body', bindings);
  } else if (input.contentType === 'card') {
    assertRcsCardHasNoSubtitleVariables(content);
    translateRcsField(content, 'title', bindings);
    translateRcsField(content, 'body', bindings);
  } else if (input.contentType === 'carousel') {
    const cards = Array.isArray(content.cards) ? content.cards : [];
    for (const card of cards) {
      if (!card || typeof card !== 'object') continue;
      const record = card as Record<string, unknown>;
      translateRcsField(record, 'title', bindings);
      translateRcsField(record, 'body', bindings);
    }
    assertRcsCarouselContent(content);
  }

  if (bindings.length > 20) {
    throw new TemplateVariableBindingError(
      'O template RCS aceita no máximo 20 variáveis.',
    );
  }

  if (input.contentType === 'text') {
    const body = String(content.body ?? '');
    if (body.length > 160) {
      throw new TemplateVariableBindingError(
        'A mensagem de texto curto pode ter no máximo 160 caracteres.',
      );
    }
  }

  return {
    content,
    bindings: bindings.length === 0 ? null : { bindings },
    variables: bindings.map((item) => item.key),
  };
}

function extractComponentText(components: unknown, type: string): string {
  if (!Array.isArray(components)) return '';
  const component = components.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      String((item as Record<string, unknown>).type).toUpperCase() === type,
  ) as Record<string, unknown> | undefined;
  return typeof component?.text === 'string' ? component.text : '';
}

function asBindings(stored: unknown): TemplateVariableBindings | null {
  if (!stored || typeof stored !== 'object') return null;
  const record = stored as TemplateVariableBindings;
  if (!Array.isArray(record.bindings)) return null;
  return record;
}

export function metaParameterIndexes(
  components: unknown,
  stored: unknown,
  part: 'header' | 'body',
): number[] {
  if (areMetaBindingsInSync(stored, components)) {
    const parsed = asBindings(stored)!;
    const slots = parsed.metaSlots ?? { header: [], body: [] };
    return part === 'header' ? [...slots.header] : [...slots.body];
  }

  if (part === 'header') {
    const headerText = extractComponentText(components, 'HEADER');
    return countTemplateVariables(headerText) > 0 ? [1] : [];
  }

  const bodyCount = countTemplateVariables(extractComponentText(components, 'BODY'));
  return Array.from({ length: bodyCount }, (_, offset) => offset + 1);
}

export function areMetaBindingsInSync(stored: unknown, components: unknown): boolean {
  if (stored == null) return false;
  const parsed = asBindings(stored);
  if (!parsed) return false;

  const slots = parsed.metaSlots ?? { header: [], body: [] };
  const bindingIndexes = new Set(parsed.bindings.map((item) => item.index));
  if ([...slots.header, ...slots.body].some((index) => !bindingIndexes.has(index))) {
    return false;
  }

  const headerNumbers = positionalNumbers(extractComponentText(components, 'HEADER'));
  const bodyNumbers = positionalNumbers(extractComponentText(components, 'BODY'));
  if (!headerNumbers || !bodyNumbers) return false;

  if (slots.header.length === 0) {
    if (headerNumbers.length > 0) return false;
  } else if (slots.header.length === 1) {
    if (headerNumbers.length === 0 || headerNumbers.some((n) => n !== 1)) return false;
  } else {
    return false;
  }

  const expectedLocals = slots.body.length;
  const present = new Set(bodyNumbers);
  for (let local = 1; local <= expectedLocals; local += 1) {
    if (!present.has(local)) return false;
  }
  if (bodyNumbers.some((n) => n > expectedLocals)) return false;

  return true;
}

function unwrapRcsContent(content: unknown): Record<string, unknown> {
  if (!content || typeof content !== 'object') return {};
  const obj = content as Record<string, unknown>;
  if (obj.text && typeof obj.text === 'object' && !Array.isArray(obj.text)) {
    return obj.text as Record<string, unknown>;
  }
  if (obj.media && typeof obj.media === 'object' && !Array.isArray(obj.media)) {
    return obj.media as Record<string, unknown>;
  }
  if (obj.card && typeof obj.card === 'object') {
    return obj.card as Record<string, unknown>;
  }
  if (obj.carousel && typeof obj.carousel === 'object') {
    return obj.carousel as Record<string, unknown>;
  }
  return obj;
}

function collectRcsPlaceholderSet(content: unknown): Set<number> | null {
  const inner = unwrapRcsContent(content);
  const texts: string[] = [];
  if (typeof inner.title === 'string') texts.push(inner.title);
  if (typeof inner.body === 'string') texts.push(inner.body);
  if (typeof inner.footer === 'string') texts.push(inner.footer);
  if (Array.isArray(inner.cards)) {
    for (const card of inner.cards) {
      if (!card || typeof card !== 'object') continue;
      const record = card as Record<string, unknown>;
      if (typeof record.title === 'string') texts.push(record.title);
      if (typeof record.body === 'string') texts.push(record.body);
    }
  }

  const numbers = new Set<number>();
  for (const text of texts) {
    const parsed = positionalNumbers(text);
    if (!parsed) return null;
    for (const n of parsed) numbers.add(n);
  }
  return numbers;
}

export function areRcsBindingsInSync(stored: unknown, content: unknown): boolean {
  if (stored == null) return false;
  const parsed = asBindings(stored);
  if (!parsed) return false;

  const found = collectRcsPlaceholderSet(content);
  if (!found) return false;

  const expected = new Set(parsed.bindings.map((item) => item.index));
  if (found.size !== expected.size) return false;
  for (const index of expected) {
    if (!found.has(index)) return false;
  }
  return true;
}

function replaceMetaLocals(text: string, slotIndexes: number[], keyByIndex: Map<number, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, digits: string) => {
    const local = Number(digits);
    const globalIndex = slotIndexes[local - 1];
    const key = globalIndex != null ? keyByIndex.get(globalIndex) : undefined;
    return key ? `{{${key}}}` : match;
  });
}

export function rehydrateMetaComponents(
  components: unknown,
  stored: unknown,
): { components: unknown; variableBindingsApplicable: boolean } {
  if (stored == null || !areMetaBindingsInSync(stored, components)) {
    return { components, variableBindingsApplicable: false };
  }

  const parsed = asBindings(stored)!;
  const keyByIndex = new Map(parsed.bindings.map((item) => [item.index, item.key]));
  const slots = parsed.metaSlots ?? { header: [], body: [] };
  const cloned = cloneJson(components);

  if (Array.isArray(cloned)) {
    for (const component of cloned) {
      if (!component || typeof component !== 'object') continue;
      const record = component as Record<string, unknown>;
      const type = String(record.type).toUpperCase();
      if (type === 'HEADER' && typeof record.text === 'string') {
        record.text = replaceMetaLocals(record.text, slots.header, keyByIndex);
      }
      if (type === 'BODY' && typeof record.text === 'string') {
        record.text = replaceMetaLocals(record.text, slots.body, keyByIndex);
      }
    }
  }

  return { components: cloned, variableBindingsApplicable: true };
}

function replaceRcsIndexes(text: string, keyByIndex: Map<number, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, digits: string) => {
    const key = keyByIndex.get(Number(digits));
    return key ? `{{${key}}}` : match;
  });
}

function rehydrateRcsObject(
  obj: Record<string, unknown>,
  keyByIndex: Map<number, string>,
): void {
  for (const field of ['title', 'body', 'footer'] as const) {
    if (typeof obj[field] === 'string') {
      obj[field] = replaceRcsIndexes(obj[field] as string, keyByIndex);
    }
  }
  if (Array.isArray(obj.cards)) {
    for (const card of obj.cards) {
      if (card && typeof card === 'object') {
        rehydrateRcsObject(card as Record<string, unknown>, keyByIndex);
      }
    }
  }
  for (const wrap of ['text', 'media', 'card', 'carousel'] as const) {
    if (obj[wrap] && typeof obj[wrap] === 'object' && !Array.isArray(obj[wrap])) {
      rehydrateRcsObject(obj[wrap] as Record<string, unknown>, keyByIndex);
    }
  }
}

export function rehydrateRcsContent(
  content: unknown,
  stored: unknown,
): { content: unknown; variableBindingsApplicable: boolean } {
  if (stored == null || !areRcsBindingsInSync(stored, content)) {
    return { content, variableBindingsApplicable: false };
  }

  const parsed = asBindings(stored)!;
  const keyByIndex = new Map(parsed.bindings.map((item) => [item.index, item.key]));
  const cloned = cloneJson(content);
  if (cloned && typeof cloned === 'object') {
    rehydrateRcsObject(cloned as Record<string, unknown>, keyByIndex);
  }
  return { content: cloned, variableBindingsApplicable: true };
}
