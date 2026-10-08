import { CADASTRO_KEYS, scriptFor, type ServiceModel } from './sheet-script'

export const LAUNDRY_TYPE_KEY = 'laundryType'
export const STORE_KEY = 'store'

export const LAUNDRY_TYPE_OPTIONS: Array<{ id: ServiceModel; label: string }> = [
  { id: 'SELF_SERVICE', label: 'Auto serviço' },
  { id: 'CONVENTIONAL', label: 'Convencional' },
]

export function objectiveFor(model: ServiceModel): string {
  return model === 'SELF_SERVICE'
    ? 'Responder os clientes de uma lavanderia de auto serviço.'
    : 'Responder os clientes de uma lavanderia convencional.'
}

export function laundryModelFromLabel(label: string): ServiceModel | null {
  return LAUNDRY_TYPE_OPTIONS.find((option) => option.label === label)?.id ?? null
}

export type WizardAnswers = {
  agentName: string
  agentObjective: string
  answers: Record<string, string>
}

export type WizardChoice = {
  key: string
  question: string
  options: string[]
  textOnly: boolean
}

const YES_NO = [
  'payPix',
  'payCredit',
  'payDebit',
  'payCash',
  'payApp',
  'productOwn',
  'appAvailability',
  'appCycle',
  'wifi',
]

const OPTION_GROUPS: Record<string, string[]> = {
  productSoap: ['Incluso', 'Cliente traz', 'Não se aplica'],
  productSoftener: ['Incluso', 'Cliente traz', 'Não se aplica'],
  priceWash: ['Não tem', 'Não se aplica', 'Cobrado por ciclo', 'Cobrado por kg'],
  priceDry: ['Não tem', 'Não se aplica', 'Cobrado por ciclo', 'Cobrado por kg'],
  priceFullCycle: ['Não tem', 'Não se aplica', 'Cobrado por ciclo', 'Cobrado por kg'],
  priceComforter: ['Não tem', 'Não se aplica', 'Cobrado por ciclo', 'Cobrado por kg'],
  priceOther: ['Não tem', 'Não se aplica', 'Cobrado por ciclo', 'Cobrado por kg'],
  pieceComforter: ['Aceita', 'Não aceita', 'Não se aplica'],
  pieceBlanket: ['Aceita', 'Não aceita', 'Não se aplica'],
  pieceRug: ['Aceita', 'Não aceita', 'Não se aplica'],
  pieceSneakers: ['Aceita', 'Não aceita', 'Não se aplica'],
  piecePet: ['Aceita', 'Não aceita', 'Não se aplica'],
  machineWashers: ['1', '2', '3 ou mais', 'Não tem', 'Não se aplica'],
  machineDryers: ['1', '2', '3 ou mais', 'Não tem', 'Não se aplica'],
  machineWashTime: ['30 minutos', '45 minutos', '1 hora', 'Não se aplica'],
  machineDryTime: ['30 minutos', '45 minutos', '1 hora', 'Não se aplica'],
  generalHours: ['24 horas', 'Horário comercial', 'Fechado', 'Não se aplica'],
  holidayHours: ['24 horas', 'Horário comercial', 'Fechado', 'Não se aplica'],
  humanSupportHours: ['24 horas', 'Horário comercial', 'Fechado', 'Não se aplica'],
  supportHours: ['24 horas', 'Horário comercial', 'Fechado', 'Não se aplica'],
}

function filled(value: string | undefined): boolean {
  return (value ?? '').trim() !== ''
}

function isCadastroKey(key: string): boolean {
  return (CADASTRO_KEYS as readonly string[]).includes(key)
}

export function wizardKeys(model: ServiceModel): string[] {
  const asked = scriptFor(model)
    .map((field) => field.key)
    .filter((key) => !isCadastroKey(key))
  return ['agentName', LAUNDRY_TYPE_KEY, STORE_KEY, ...asked]
}

export function wizardStepForMissing(key: string): string {
  return isCadastroKey(key) ? STORE_KEY : key
}

export function nextWizardKey(model: ServiceModel, progress: WizardAnswers): string | null {
  return wizardKeys(model).find((key) => stepEmpty(key, progress)) ?? null
}

export function wizardProgress(model: ServiceModel, progress: WizardAnswers): {
  answered: number
  total: number
} {
  const keys = wizardKeys(model)
  const answered = keys.filter((key) => !stepEmpty(key, progress)).length
  return { answered, total: keys.length }
}

function stepEmpty(key: string, progress: WizardAnswers): boolean {
  if (key === 'agentName') return !filled(progress.agentName)
  if (key === LAUNDRY_TYPE_KEY) return !filled(progress.agentObjective)
  if (key === STORE_KEY) return CADASTRO_KEYS.some((cadastroKey) => !filled(progress.answers[cadastroKey]))
  return !filled(progress.answers[key])
}

export function wizardChoice(
  key: string,
  _model: ServiceModel,
  preset: string | null,
): Pick<WizardChoice, 'options' | 'textOnly'> {
  if (key === LAUNDRY_TYPE_KEY) {
    return { options: LAUNDRY_TYPE_OPTIONS.map((option) => option.label), textOnly: false }
  }

  if (key === STORE_KEY) {
    return { options: [], textOnly: false }
  }

  if (key === 'agentName' || isCadastroKey(key)) {
    if (!preset || preset.trim() === '') return { options: [], textOnly: true }
    return { options: [preset.trim()], textOnly: false }
  }

  if (YES_NO.includes(key)) {
    return { options: ['Sim', 'Não', 'Não se aplica'], textOnly: false }
  }

  return {
    options: OPTION_GROUPS[key] ?? ['Não tem', 'Não se aplica'],
    textOnly: false,
  }
}

export function wizardQuestion(key: string, model: ServiceModel): string {
  if (key === 'agentName') return 'Qual é o nome do agente?'
  if (key === LAUNDRY_TYPE_KEY) return 'Sua lavanderia é de auto serviço ou convencional?'
  if (key === STORE_KEY) return 'Confira os dados da loja'
  const field = scriptFor(model).find((item) => item.key === key)
  return field?.question ?? ''
}
