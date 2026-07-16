import type {
  CreateMetaTemplatePayload,
  MetaTemplateFormValues,
  MetaTemplateStatus,
} from '@/types/metaTemplate.types'

export const META_TEMPLATE_STATUS_LABELS: Record<MetaTemplateStatus, string> = {
  PENDING: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  DISABLED: 'Desabilitado',
  PAUSED: 'Pausado',
  IN_APPEAL: 'Em recurso',
  DELETED: 'Removido',
  ERROR: 'Erro',
}

export const META_TEMPLATE_STATUS_COLORS: Record<
  MetaTemplateStatus,
  'green' | 'orange' | 'red' | 'gray' | 'blue'
> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  DISABLED: 'gray',
  PAUSED: 'gray',
  IN_APPEAL: 'blue',
  DELETED: 'gray',
  ERROR: 'red',
}

export const META_TEMPLATE_CATEGORY_LABELS = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
} as const

export function countTemplateVariables(text: string): number {
  const matches = text.match(/\{\{\d+\}\}/g)
  if (!matches) return 0
  const indices = matches.map((m) => Number(m.replace(/\D/g, '')))
  return Math.max(0, ...indices)
}

export function extractComponentText(
  components: Array<{ type?: string; text?: string }> | undefined,
  type: string
): string | null {
  const component = components?.find(
    (item) => item.type?.toUpperCase() === type.toUpperCase()
  )
  return component?.text?.trim() || null
}

export function extractHeaderFormat(
  components: Array<{ type?: string; format?: string }> | undefined
): string | null {
  const header = components?.find(
    (item) => item.type?.toUpperCase() === 'HEADER'
  )
  return header?.format ?? null
}

export function getTemplateDisplayLabel(template: {
  displayName?: string | null
  name: string
}): string {
  return template.displayName?.trim() || template.name
}

export function buildDefaultFormValues(): MetaTemplateFormValues {
  return {
    displayName: '',
    category: 'MARKETING',
    language: 'pt_BR',
    headerEnabled: false,
    headerFormat: 'IMAGE',
    headerText: '',
    headerExample: '',
    headerImageBase64: null,
    headerImageUrl: null,
    bodyText: '',
    bodyExamples: [],
    footerText: '',
    buttons: [],
  }
}

export function buildCreatePayload(
  values: MetaTemplateFormValues,
  headerMediaUrl?: string | null
): CreateMetaTemplatePayload {
  const variableCount = countTemplateVariables(values.bodyText)
  const bodyExamples =
    values.bodyExamples.length > 0
      ? values.bodyExamples.slice(0, variableCount)
      : variableCount > 0
        ? Array.from({ length: variableCount }, (_, index) =>
            index === 0 ? 'Cliente' : `Valor ${index + 1}`
          )
        : undefined

  const payload: CreateMetaTemplatePayload = {
    displayName: values.displayName.trim(),
    category: values.category,
    language: values.language,
    body: {
      text: values.bodyText.trim(),
      examples: bodyExamples,
    },
  }

  if (values.headerEnabled) {
    if (values.headerFormat === 'TEXT') {
      payload.header = {
        format: 'TEXT',
        text: values.headerText.trim(),
        example: values.headerExample.trim() || undefined,
      }
    } else if (headerMediaUrl) {
      payload.header = {
        format: values.headerFormat,
        mediaUrl: headerMediaUrl,
      }
    }
  }

  if (values.footerText.trim()) {
    payload.footer = values.footerText.trim()
  }

  if (values.buttons.length > 0) {
    payload.buttons = values.buttons.map((button) => ({
      type: button.type,
      text: button.text.trim(),
      url: button.url?.trim() || undefined,
      urlExample: button.urlExample?.trim() || undefined,
      phoneNumber: button.phoneNumber?.trim() || undefined,
    }))
  }

  return payload
}

export function previewMetaTemplateName(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 503)

  return `${base || 'template'}_xxxxxxxx`
}
