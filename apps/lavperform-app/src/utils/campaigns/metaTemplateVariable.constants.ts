export const META_TEMPLATE_VARIABLE_SOURCE = {
  CUSTOMER_FIRST_NAME: 'customer_first_name',
  CUSTOMER_NAME: 'customer_name',
  DAYS_SINCE_LAST_ORDER: 'days_since_last_order',
  STORE_NAME: 'store_name',
} as const

export type MetaTemplateVariableSource =
  (typeof META_TEMPLATE_VARIABLE_SOURCE)[keyof typeof META_TEMPLATE_VARIABLE_SOURCE]

export type MetaTemplateVariableMapping = {
  index: number
  source: MetaTemplateVariableSource
}

const KNOWN_TEMPLATE_SOURCES = new Set<string>(
  Object.values(META_TEMPLATE_VARIABLE_SOURCE),
)

export function toKnownTemplateMappings(
  mappings: Array<{ index: number; source: string }> | null | undefined,
): MetaTemplateVariableMapping[] {
  if (!mappings) return []
  return mappings.flatMap((mapping) =>
    KNOWN_TEMPLATE_SOURCES.has(mapping.source)
      ? [
          {
            index: mapping.index,
            source: mapping.source as MetaTemplateVariableSource,
          },
        ]
      : [],
  )
}

export type TemplateVariableSuggestion = {
  key: string
  label: string
  source: MetaTemplateVariableSource
  example: string
}

export const TEMPLATE_VARIABLE_SUGGESTIONS: ReadonlyArray<TemplateVariableSuggestion> =
  [
    {
      key: 'primeiro_nome',
      label: 'Primeiro nome',
      source: META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME,
      example: 'Maria',
    },
    {
      key: 'nome_cliente',
      label: 'Nome do cliente',
      source: META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_NAME,
      example: 'Maria Silva',
    },
    {
      key: 'dias_sem_venda',
      label: 'Dias desde a última venda',
      source: META_TEMPLATE_VARIABLE_SOURCE.DAYS_SINCE_LAST_ORDER,
      example: '15',
    },
    {
      key: 'nome_loja',
      label: 'Nome da loja',
      source: META_TEMPLATE_VARIABLE_SOURCE.STORE_NAME,
      example: 'Minha Loja',
    },
  ]

export function sourceForTemplateKey(
  key: string,
): MetaTemplateVariableSource | null {
  return (
    TEMPLATE_VARIABLE_SUGGESTIONS.find((item) => item.key === key)?.source ??
    null
  )
}

export function exampleForKnownKey(key: string): string {
  return (
    TEMPLATE_VARIABLE_SUGGESTIONS.find((item) => item.key === key)?.example ??
    ''
  )
}

export type TemplateVariableMappingLine = {
  index: number
  source: MetaTemplateVariableSource | null
  key: string | null
}

export type MappingsForTemplateInput = {
  variableBindingsApplicable?: boolean
  variableBindings?: {
    bindings?: Array<{ index: number; key: string }>
  } | null
  components?: Array<{ type?: string; format?: string; text?: string }>
}

function countPositionalVariables(text: string | undefined): number {
  const matches = text?.match(/\{\{\d+\}\}/g)
  if (!matches) return 0
  return Math.max(...matches.map((token) => Number(token.replace(/\D/g, ''))))
}

function componentByType(
  components: MappingsForTemplateInput['components'],
  type: string,
) {
  return components?.find(
    (item) => item.type?.toUpperCase() === type.toUpperCase(),
  )
}

export function mappingsForTemplate(
  template: MappingsForTemplateInput,
): TemplateVariableMappingLine[] {
  if (template.variableBindingsApplicable) {
    return (template.variableBindings?.bindings ?? []).map(({ index, key }) => ({
      index,
      key,
      source: sourceForTemplateKey(key),
    }))
  }

  const bodyText = componentByType(template.components, 'BODY')?.text
  const bodyCount = countPositionalVariables(bodyText)
  if (bodyCount > 0) {
    return Array.from({ length: bodyCount }, (_, offset) => ({
      index: offset + 1,
      source: null,
      key: null,
    }))
  }

  const header = componentByType(template.components, 'HEADER')
  if (
    header?.format?.toUpperCase() === 'TEXT' &&
    countPositionalVariables(header.text) > 0
  ) {
    return [{ index: 1, source: null, key: null }]
  }

  return []
}

export function automaticFillMessage(
  lines: TemplateVariableMappingLine[],
): string | null {
  if (lines.length === 0 || lines.some((line) => !line.source)) return null

  const labels = lines.map((line) => {
    const byKey = TEMPLATE_VARIABLE_SUGGESTIONS.find(
      (item) => item.key === line.key,
    )?.label
    if (byKey) return byKey.toLowerCase()
    return (
      TEMPLATE_VARIABLE_SUGGESTIONS.find((item) => item.source === line.source)
        ?.label.toLowerCase() ?? line.source
    )
  })

  return `Este template preenche ${labels.join(' e ')} automaticamente.`
}

export function applyTemplateMappingLines(
  lines: TemplateVariableMappingLine[],
  current: MetaTemplateVariableMapping[],
  options?: { inheritUnsourced?: boolean },
): MetaTemplateVariableMapping[] {
  const inheritUnsourced = options?.inheritUnsourced === true
  const next: MetaTemplateVariableMapping[] = []

  for (const line of lines) {
    if (line.source) {
      next.push({ index: line.index, source: line.source })
      continue
    }
    if (!inheritUnsourced) continue
    const existing = current.find((mapping) => mapping.index === line.index)
    if (existing?.source) next.push(existing)
  }

  return next
}

export function completeTemplateVariableMappings(
  lines: TemplateVariableMappingLine[],
  chosen: MetaTemplateVariableMapping[],
): MetaTemplateVariableMapping[] | null {
  const mappings: MetaTemplateVariableMapping[] = []

  for (const line of lines) {
    const source =
      line.source ??
      chosen.find((mapping) => mapping.index === line.index)?.source
    if (!source) return null
    mappings.push({ index: line.index, source })
  }

  return mappings
}

export const META_TEMPLATE_VARIABLE_OPTIONS: ReadonlyArray<{
  value: MetaTemplateVariableSource
  label: string
}> = TEMPLATE_VARIABLE_SUGGESTIONS.map((item) => ({
  value: item.source,
  label: item.label,
}))

export function getMetaTemplateVariableLabel(source: string): string {
  return (
    META_TEMPLATE_VARIABLE_OPTIONS.find((option) => option.value === source)
      ?.label ?? source
  )
}
