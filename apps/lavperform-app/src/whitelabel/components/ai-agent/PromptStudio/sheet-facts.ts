import { scriptFor, type ServiceModel } from './sheet-script'

export const NOT_OFFERED = 'A unidade não oferece isso.'

const ABSENT_ANSWERS = new Set([
  'não tem',
  'nao tem',
  'não se aplica',
  'nao se aplica',
])

function isAbsentAnswer(value: string): boolean {
  return ABSENT_ANSWERS.has(value.trim().toLowerCase())
}

export function factsFromSheet(
  model: ServiceModel,
  answers: Record<string, string>
): Array<{ key: string; label: string; text: string }> {
  return scriptFor(model).map((field) => {
    const raw = answers[field.key] ?? ''
    const text = isAbsentAnswer(raw) ? NOT_OFFERED : raw.trim()
    return { key: field.key, label: field.label, text }
  })
}
