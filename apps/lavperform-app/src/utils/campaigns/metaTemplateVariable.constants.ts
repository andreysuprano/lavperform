export const META_TEMPLATE_VARIABLE_SOURCE = {
  CUSTOMER_FIRST_NAME: 'customer_first_name',
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
