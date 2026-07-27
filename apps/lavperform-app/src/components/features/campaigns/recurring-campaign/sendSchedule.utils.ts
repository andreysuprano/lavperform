export type SendScheduleMode = 'establishment' | 'fixed' | 'range'

/** Normaliza valor de input[type=time] (HH:mm ou HH:mm:ss) para HH:mm. */
export function normalizeTimeToHHmm(
  value?: string | null,
): string | null {
  if (!value || !String(value).trim()) return null
  const trimmed = String(value).trim()
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::\d{2})?$/)
  if (!match) return trimmed.slice(0, 5)
  return `${match[1]}:${match[2]}`
}

export function inferSendScheduleMode(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null,
): SendScheduleMode {
  if (!sendTimeStart) return 'establishment'
  if (sendTimeEnd) return 'range'
  return 'fixed'
}

export function formatSendScheduleLabel(
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null,
): string {
  const mode = inferSendScheduleMode(sendTimeStart, sendTimeEnd)

  if (mode === 'establishment') {
    return 'Horário de funcionamento do estabelecimento'
  }

  if (mode === 'fixed' && sendTimeStart) {
    return `Horário fixo às ${normalizeTimeToHHmm(sendTimeStart) ?? sendTimeStart}`
  }

  if (mode === 'range' && sendTimeStart && sendTimeEnd) {
    return `Intervalo das ${normalizeTimeToHHmm(sendTimeStart) ?? sendTimeStart} às ${normalizeTimeToHHmm(sendTimeEnd) ?? sendTimeEnd}`
  }

  return 'Horário de funcionamento do estabelecimento'
}

export function buildSendScheduleApiFields(
  mode: SendScheduleMode,
  sendTimeStart?: string | null,
  sendTimeEnd?: string | null,
): { sendTimeStart: string | null; sendTimeEnd: string | null } {
  if (mode === 'establishment') {
    return { sendTimeStart: null, sendTimeEnd: null }
  }

  if (mode === 'fixed') {
    return {
      sendTimeStart: normalizeTimeToHHmm(sendTimeStart),
      sendTimeEnd: null,
    }
  }

  return {
    sendTimeStart: normalizeTimeToHHmm(sendTimeStart),
    sendTimeEnd: normalizeTimeToHHmm(sendTimeEnd),
  }
}

export const SEND_SCHEDULE_MODE_OPTIONS: Array<{
  value: SendScheduleMode
  label: string
  description: string
}> = [
  {
    value: 'establishment',
    label: 'Horário de funcionamento',
    description: 'Envia dentro do horário cadastrado nas configurações da empresa.',
  },
  {
    value: 'fixed',
    label: 'Horário fixo',
    description: 'Todas as mensagens do dia são enviadas no mesmo horário.',
  },
  {
    value: 'range',
    label: 'Intervalo de horário',
    description: 'Distribui os envios aleatoriamente dentro do intervalo escolhido.',
  },
]
