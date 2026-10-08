import { CADASTRO_KEYS, scriptFor, type ServiceModel } from './sheet-script'

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

const OBJECTIVE = [
  'Atender clientes no WhatsApp sobre horário, preço e máquinas.',
  'Responder dúvidas e chamar um atendente quando não souber.',
]

function filled(value: string | undefined): boolean {
  return (value ?? '').trim() !== ''
}

export function wizardKeys(model: ServiceModel): string[] {
  return ['agentName', 'agentObjective', ...scriptFor(model).map((field) => field.key)]
}

export function nextWizardKey(model: ServiceModel, progress: WizardAnswers): string | null {
  return (
    wizardKeys(model).find((key) => {
      if (key === 'agentName') return !filled(progress.agentName)
      if (key === 'agentObjective') return !filled(progress.agentObjective)
      return !filled(progress.answers[key])
    }) ?? null
  )
}

export function wizardProgress(model: ServiceModel, progress: WizardAnswers): {
  answered: number
  total: number
} {
  const keys = wizardKeys(model)
  const answered = keys.length - keys.filter((key) => nextIsEmpty(key, progress)).length
  return { answered, total: keys.length }
}

function nextIsEmpty(key: string, progress: WizardAnswers): boolean {
  if (key === 'agentName') return !filled(progress.agentName)
  if (key === 'agentObjective') return !filled(progress.agentObjective)
  return !filled(progress.answers[key])
}

export function wizardChoice(
  key: string,
  model: ServiceModel,
  preset: string | null,
): Pick<WizardChoice, 'options' | 'textOnly'> {
  if (key === 'agentName' || (CADASTRO_KEYS as readonly string[]).includes(key)) {
    if (!preset || preset.trim() === '') return { options: [], textOnly: true }
    return { options: [preset.trim()], textOnly: false }
  }

  if (key === 'agentObjective') {
    const extra =
      model === 'SELF_SERVICE'
        ? 'Orientar o cliente a operar as máquinas.'
        : 'Informar como funciona o serviço da loja.'
    return { options: [...OBJECTIVE, extra], textOnly: false }
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
  if (key === 'agentObjective') return 'Qual é o objetivo deste agente?'
  const field = scriptFor(model).find((item) => item.key === key)
  return field?.question ?? ''
}
