export const META_TEMPLATE_VARIABLE_SOURCE = {
  CUSTOMER_FIRST_NAME: 'customer_first_name',
  CUSTOMER_NAME: 'customer_name',
  DAYS_SINCE_LAST_ORDER: 'days_since_last_order',
  STORE_NAME: 'store_name',
} as const;

export type MetaTemplateVariableSource =
  (typeof META_TEMPLATE_VARIABLE_SOURCE)[keyof typeof META_TEMPLATE_VARIABLE_SOURCE];

export type MetaTemplateVariableMapping = {
  index: number;
  source: MetaTemplateVariableSource | string;
};

const KNOWN_SOURCES = new Set<string>(
  Object.values(META_TEMPLATE_VARIABLE_SOURCE),
);

export function isKnownMetaTemplateVariableSource(
  source: string,
): source is MetaTemplateVariableSource {
  return KNOWN_SOURCES.has(source);
}

export function countTemplateVariables(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches?.length) return 0;
  const indices = matches.map((match) => Number(match.replace(/\D/g, '')));
  return Math.max(0, ...indices);
}

export function extractComponentText(
  components: unknown,
  type: string,
): string | null {
  if (!Array.isArray(components)) return null;
  const component = components.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      String((item as Record<string, unknown>).type).toUpperCase() ===
        type.toUpperCase(),
  ) as Record<string, unknown> | undefined;
  const text = component?.text;
  return typeof text === 'string' ? text : null;
}

export function countTemplateBodyVariables(components: unknown): number {
  const bodyText = extractComponentText(components, 'BODY');
  return bodyText ? countTemplateVariables(bodyText) : 0;
}

export type TemplateVariableContext = {
  customerName: string;
  lastOrderDate?: Date | string | null;
  companyName?: string | null;
};

export function extractCustomerFirstName(fullName: string): string {
  const trimmed = fullName?.trim() ?? '';
  if (!trimmed) return 'Cliente';
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function calculateDaysSinceLastOrder(
  lastOrderDate?: Date | string | null,
): number {
  if (!lastOrderDate) return 0;
  const last = new Date(lastOrderDate);
  if (Number.isNaN(last.getTime())) return 0;
  const diffMs = Date.now() - last.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function resolveTemplateVariableValue(
  source: string,
  ctx: TemplateVariableContext,
): string {
  switch (source) {
    case META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME:
      return extractCustomerFirstName(ctx.customerName);
    case META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_NAME:
      return ctx.customerName?.trim() || 'Cliente';
    case META_TEMPLATE_VARIABLE_SOURCE.DAYS_SINCE_LAST_ORDER:
      return String(calculateDaysSinceLastOrder(ctx.lastOrderDate));
    case META_TEMPLATE_VARIABLE_SOURCE.STORE_NAME:
      return ctx.companyName?.trim() ?? '';
    default:
      return '';
  }
}

export function buildBodyParametersFromMappings(
  variableCount: number,
  mappings: MetaTemplateVariableMapping[],
  ctx: TemplateVariableContext,
): string[] {
  const byIndex = new Map(mappings.map((mapping) => [mapping.index, mapping.source]));

  return Array.from({ length: variableCount }, (_, offset) => {
    const index = offset + 1;
    const source = byIndex.get(index);
    if (!source) {
      return extractCustomerFirstName(ctx.customerName);
    }
    return resolveTemplateVariableValue(source, ctx);
  });
}

export function normalizeMetaTemplateVariableMappings(
  raw: unknown,
): MetaTemplateVariableMapping[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is MetaTemplateVariableMapping =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as MetaTemplateVariableMapping).index === 'number' &&
        typeof (item as MetaTemplateVariableMapping).source === 'string',
    )
    .map((item) => ({
      index: item.index,
      source: item.source,
    }));
}
