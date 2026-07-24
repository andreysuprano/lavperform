import type {
  CreateMetaTemplateButton,
  CreateMetaTemplatePayload,
  MetaMessageTemplate,
  MetaTemplateFormValues,
  MetaTemplateHeaderFormat,
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

const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu

export function sanitizeFooterText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(EMOJI_REGEX, '')
}

export function formatMetaTemplateError(
  rejectedReason: string | null | undefined
): { title: string | null; message: string } | null {
  if (!rejectedReason) return null
  const raw = rejectedReason.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const err = (parsed?.error ?? parsed) as Record<string, unknown>
    const title =
      typeof err?.error_user_title === 'string' ? err.error_user_title : null
    const message =
      (typeof err?.error_user_msg === 'string' && err.error_user_msg) ||
      (typeof err?.message === 'string' && err.message) ||
      raw
    return { title, message: String(message) }
  } catch {
    return { title: null, message: raw }
  }
}

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
    payload.footer = sanitizeFooterText(values.footerText).trim()
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

function parseTemplateButtons(
  buttons?: Array<Record<string, unknown>>
): CreateMetaTemplateButton[] {
  if (!buttons?.length) return []

  return buttons.map((button) => {
    const type = String(button.type ?? '').toUpperCase()

    if (type === 'URL') {
      const example = button.example
      return {
        type: 'URL',
        text: String(button.text ?? ''),
        url: String(button.url ?? ''),
        urlExample: Array.isArray(example) ? String(example[0] ?? '') : '',
      }
    }

    if (type === 'PHONE_NUMBER') {
      return {
        type: 'PHONE_NUMBER',
        text: String(button.text ?? ''),
        phoneNumber: String(button.phone_number ?? button.phoneNumber ?? ''),
      }
    }

    return {
      type: 'QUICK_REPLY',
      text: String(button.text ?? ''),
    }
  })
}

export function buildFormValuesFromTemplate(
  template: MetaMessageTemplate
): MetaTemplateFormValues {
  const headerFormat = extractHeaderFormat(template.components)
  const headerComponent = template.components.find(
    (item) => item.type?.toUpperCase() === 'HEADER'
  )
  const bodyComponent = template.components.find(
    (item) => item.type?.toUpperCase() === 'BODY'
  )
  const buttonsComponent = template.components.find(
    (item) => item.type?.toUpperCase() === 'BUTTONS'
  )

  const headerExample =
    (headerComponent?.example as { header_text?: string[] } | undefined)
      ?.header_text?.[0] ?? ''

  const bodyExamples =
    (bodyComponent?.example as { body_text?: string[][] } | undefined)
      ?.body_text?.[0] ?? []

  return {
    displayName: getTemplateDisplayLabel(template),
    category: template.category,
    language: template.language,
    headerEnabled: !!headerFormat,
    headerFormat: (headerFormat as MetaTemplateHeaderFormat) || 'IMAGE',
    headerText: extractComponentText(template.components, 'HEADER') ?? '',
    headerExample,
    headerImageBase64: null,
    headerImageUrl: template.headerMediaUrl,
    bodyText: extractComponentText(template.components, 'BODY') ?? '',
    bodyExamples,
    footerText: extractComponentText(template.components, 'FOOTER') ?? '',
    buttons: parseTemplateButtons(buttonsComponent?.buttons),
  }
}

export function canEditMetaTemplate(template: MetaMessageTemplate): boolean {
  if (!template.metaTemplateId) return false
  return ['APPROVED', 'REJECTED', 'PAUSED'].includes(template.status)
}

export function canEditMetaTemplateCategory(
  status: MetaTemplateStatus
): boolean {
  return ['REJECTED', 'PAUSED'].includes(status)
}

export function getMetaTemplateEditBlockedReason(
  template: MetaMessageTemplate
): string | null {
  if (!template.metaTemplateId) {
    return 'Este template não foi enviado à Meta. Crie um novo template.'
  }

  if (template.status === 'PENDING' || template.status === 'IN_APPEAL') {
    return 'Aguarde a conclusão da análise da Meta para editar.'
  }

  if (template.status === 'DISABLED' || template.status === 'DELETED') {
    return 'Templates desabilitados ou removidos não podem ser editados.'
  }

  if (!canEditMetaTemplate(template)) {
    return 'Este template não pode ser editado no momento.'
  }

  return null
}
