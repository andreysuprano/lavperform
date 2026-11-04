export type PixelMeasurement = {
  pixelId: string | null
  enabled: boolean
}

export type GtmMeasurement = {
  containerId: string | null
  enabled: boolean
}

export type MeasurementNotice = {
  badge?: string
  badgeTone?: 'green'
  title?: string
  text: string
  actionLabel: string
  href: string | null
}

export function pixelMeasurementNotice(
  state: PixelMeasurement,
  canConfigure: boolean
): MeasurementNotice {
  const href = canConfigure ? '/trafego/pixel' : null
  if (state.pixelId && state.enabled) {
    return {
      badge: 'Pixel ativo',
      badgeTone: 'green',
      text: `As páginas publicadas enviam PageView para o Pixel ${state.pixelId}.`,
      actionLabel: 'Ajustar',
      href,
    }
  }
  if (state.pixelId && !state.enabled) {
    return {
      badge: 'Pixel pausado',
      text: 'O ID está salvo, mas as páginas não enviam eventos.',
      actionLabel: 'Ativar',
      href,
    }
  }
  return {
    title: 'Meça quem chega pelos anúncios.',
    text: 'Conecte o Pixel da Meta para ver, no Gerenciador de Eventos, quantas pessoas abriram estas páginas.',
    actionLabel: 'Configurar Pixel',
    href,
  }
}

export function gtmMeasurementNotice(
  state: GtmMeasurement,
  canConfigure: boolean
): MeasurementNotice {
  const href = canConfigure ? '/trafego/gtm' : null
  if (state.containerId && state.enabled) {
    return {
      badge: 'Tag Manager ativo',
      badgeTone: 'green',
      text: `As páginas publicadas carregam o contêiner ${state.containerId}.`,
      actionLabel: 'Ajustar',
      href,
    }
  }
  if (state.containerId && !state.enabled) {
    return {
      badge: 'Tag Manager pausado',
      text: 'O ID está salvo, mas as páginas não carregam o contêiner.',
      actionLabel: 'Ativar',
      href,
    }
  }
  return {
    title: 'Carregue suas tags nas páginas.',
    text: 'Conecte o contêiner do Google Tag Manager para disparar as tags dele quando alguém abre estas páginas.',
    actionLabel: 'Configurar Tag Manager',
    href,
  }
}

export function noticeFromQuery<T>(
  query: { isError: boolean; data?: T },
  build: (data: T) => MeasurementNotice
) {
  if (query.isError || !query.data) return null
  return build(query.data)
}
