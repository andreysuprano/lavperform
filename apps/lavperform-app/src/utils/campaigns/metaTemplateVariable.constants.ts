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

export const META_TEMPLATE_VARIABLE_OPTIONS: ReadonlyArray<{
  value: MetaTemplateVariableSource
  label: string
}> = [
  {
    value: META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME,
    label: 'Primeiro nome do cliente',
  },
  {
    value: META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_NAME,
    label: 'Nome do cliente',
  },
  {
    value: META_TEMPLATE_VARIABLE_SOURCE.DAYS_SINCE_LAST_ORDER,
    label: 'Dias desde a última venda',
  },
  {
    value: META_TEMPLATE_VARIABLE_SOURCE.STORE_NAME,
    label: 'Nome da loja',
  },
]

export function getMetaTemplateVariableLabel(source: string): string {
  return (
    META_TEMPLATE_VARIABLE_OPTIONS.find((option) => option.value === source)
      ?.label ?? source
  )
}

export function buildDefaultVariableMappings(
  variableCount: number,
): MetaTemplateVariableMapping[] {
  if (variableCount <= 0) return []

  return Array.from({ length: variableCount }, (_, offset) => ({
    index: offset + 1,
    source:
      offset === 0
        ? META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME
        : META_TEMPLATE_VARIABLE_SOURCE.CUSTOMER_FIRST_NAME,
  }))
}
