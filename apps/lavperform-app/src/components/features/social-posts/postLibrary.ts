import type { SocialLibraryPost, SocialPostStatus } from '@/types'

export const LIBRARY_FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'gerando', label: 'Gerando' },
  { id: 'gerado', label: 'Gerado' },
  { id: 'agendado', label: 'Agendado' },
  { id: 'publicado', label: 'Publicado' },
] as const

export type LibraryFilter = (typeof LIBRARY_FILTERS)[number]['id']

export const STATUS_LABEL: Record<SocialPostStatus, string> = {
  rascunho: 'Rascunho',
  gerando: 'Gerando',
  gerado: 'Gerado',
  agendado: 'Agendado',
  publicado: 'Publicado',
  falhou: 'Falhou',
}

export const WIZARD_OBJECTIVES = [
  {
    value: 'atrair',
    title: 'Trazer clientes novos',
    hint: 'Para quem ainda não conhece a loja',
  },
  {
    value: 'promocao',
    title: 'Divulgar uma promoção',
    hint: 'Desconto ou condição especial',
  },
  {
    value: 'reativar',
    title: 'Chamar quem sumiu',
    hint: 'Lembrar clientes de voltar',
  },
  {
    value: 'novidade',
    title: 'Contar uma novidade',
    hint: 'Horário, serviço ou aviso',
  },
] as const

export const WIZARD_FORMATS = [
  { value: 'feed', title: 'Post único', hint: '1 imagem' },
  { value: 'carousel', title: 'Carrossel', hint: 'até 10 imagens' },
  { value: 'video', title: 'Vídeo', hint: 'até 60 s' },
] as const

export const WIZARD_DESTINATIONS = [
  { value: 'ig_feed', title: 'Feed' },
  { value: 'ig_stories', title: 'Stories' },
  { value: 'ig_reels', title: 'Reels' },
  { value: 'facebook', title: 'Facebook' },
  { value: 'google', title: 'Google Meu Negócio' },
] as const

/** Ordem atual do modal. Trocar a sequência daqui reordena a jornada. */
export const WIZARD_FLOW = [
  { id: 'objective', label: 'Objetivo & tema' },
  { id: 'photos', label: 'Fotos' },
  { id: 'format', label: 'Formato & tom' },
  { id: 'review', label: 'Revisar & gerar' },
] as const

export type WizardFlowId = (typeof WIZARD_FLOW)[number]['id']

export function wizardStepOf(id: WizardFlowId) {
  return (WIZARD_FLOW.findIndex((step) => step.id === id) + 1) as 1 | 2 | 3 | 4
}

export const CAROUSEL_BLOCKED_DESTINATIONS = ['ig_stories', 'google'] as const

export const CAROUSEL_BLOCK_MESSAGE =
  'Stories e Google Meu Negócio não aceitam carrossel.'

export function formatTitle(value: string, slideCount = 1) {
  if (value === 'story' || value === 'video') return 'Vídeo'
  if (value === 'carousel') {
    const count = Math.min(10, Math.max(2, slideCount || 2))
    return `Carrossel · ${count} slides`
  }
  return WIZARD_FORMATS.find((item) => item.value === value)?.title ?? value
}

export function destinationTitle(value: string) {
  return WIZARD_DESTINATIONS.find((item) => item.value === value)?.title ?? value
}

export function destinationsTitle(values: string[]) {
  const names = values.map((item) => destinationTitle(item))
  if (!names.length) return 'Nenhum destino'
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

export function carouselBlocked(destinations: string[]) {
  return destinations.some((item) =>
    (CAROUSEL_BLOCKED_DESTINATIONS as readonly string[]).includes(item)
  )
}

export function destinationsFromPlacement(placement?: string | null) {
  if (placement === 'story') return ['ig_stories']
  if (placement === 'google') return ['google']
  if (placement === 'feed') return ['ig_feed']
  return ['ig_feed']
}

export function legacyPlacement(destinations: string[]) {
  if (destinations.length === 1 && destinations[0] === 'google') return 'google'
  if (
    destinations.includes('ig_stories') &&
    !destinations.includes('ig_feed') &&
    !destinations.includes('facebook')
  ) {
    return 'story'
  }
  return 'feed'
}

export const WIZARD_TONES = ['Amigável', 'Divertido', 'Direto', 'Profissional'] as const

export function objectiveTitle(value: string) {
  return WIZARD_OBJECTIVES.find((item) => item.value === value)?.title ?? value
}

export function placementTitle(value: string) {
  return destinationTitle(value) || value
}

export function stripHashtags(value: string) {
  return value
    .split('\n')
    .map((line) =>
      line
        .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n')
}

export function libraryStatus(input: {
  generationStatus?: string | null
  variationCount?: number
  scheduleStatus?: string | null
  status?: string | null
}): SocialPostStatus {
  if (
    input.status === 'rascunho' ||
    input.status === 'gerando' ||
    input.status === 'gerado' ||
    input.status === 'agendado' ||
    input.status === 'publicado' ||
    input.status === 'falhou'
  ) {
    return input.status
  }
  if (input.scheduleStatus === 'PUBLISHED') return 'publicado'
  if (
    input.scheduleStatus === 'SCHEDULED' ||
    input.scheduleStatus === 'PUBLISHING'
  ) {
    return 'agendado'
  }
  if (input.generationStatus === 'generating') return 'gerando'
  if (
    input.generationStatus === 'failed' ||
    input.scheduleStatus === 'FAILED'
  ) {
    return 'falhou'
  }
  if (
    input.generationStatus === 'generated' ||
    (input.variationCount ?? 0) > 0
  ) {
    return 'gerado'
  }
  return 'rascunho'
}

export function normalizeLibraryPost(raw: Partial<SocialLibraryPost> & { id: string }): SocialLibraryPost {
  const status = libraryStatus(raw)
  return {
    id: raw.id,
    objective: raw.objective ?? 'atrair',
    theme: raw.theme ?? '',
    format: raw.format ?? 'feed',
    slideCount: raw.slideCount ?? 1,
    artStyle: raw.artStyle ?? 'fotografico_clean',
    tone: raw.tone ?? 'Amigável',
    wizardStep: raw.wizardStep ?? 1,
    placement: raw.placement ?? (raw.format === 'story' ? 'story' : 'feed'),
    destinations:
      raw.destinations && raw.destinations.length
        ? raw.destinations
        : destinationsFromPlacement(
            raw.placement ?? (raw.format === 'story' ? 'story' : 'feed')
          ),
    creativeFreedom: Boolean(raw.creativeFreedom),
    includeCaption: raw.includeCaption !== false,
    generationStatus: raw.generationStatus ?? 'idle',
    generationError: raw.generationError ?? null,
    selectedVariationId: raw.selectedVariationId ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    headline: raw.headline ?? null,
    captionExcerpt: stripHashtags(raw.captionExcerpt || raw.headline || raw.theme || ''),
    thumbnail: raw.thumbnail ?? null,
    networks: raw.networks ?? [],
    scheduledAt: raw.scheduledAt ?? null,
    publishedAt: raw.publishedAt ?? null,
    variationCount: raw.variationCount ?? 0,
    status,
    media: raw.media ?? [],
  }
}

export function filterLibrary(posts: SocialLibraryPost[], filter: LibraryFilter) {
  const sorted = [...posts].sort((a, b) => {
    const rank = (status: string) => (status === 'gerando' ? 0 : 1)
    const byStatus = rank(a.status) - rank(b.status)
    if (byStatus !== 0) return byStatus
    return +new Date(b.updatedAt) - +new Date(a.updatedAt)
  })
  if (filter === 'todos') return sorted
  return sorted.filter((post) => post.status === filter)
}

export function filterCounts(posts: SocialLibraryPost[]) {
  return {
    todos: posts.length,
    rascunho: posts.filter((post) => post.status === 'rascunho').length,
    gerando: posts.filter((post) => post.status === 'gerando').length,
    gerado: posts.filter((post) => post.status === 'gerado').length,
    agendado: posts.filter((post) => post.status === 'agendado').length,
    publicado: posts.filter((post) => post.status === 'publicado').length,
  }
}

export type WizardStep = 1 | 2 | 3 | 4

export function reopenStep(post: Pick<SocialLibraryPost, 'status' | 'wizardStep'>): WizardStep {
  if (post.status !== 'rascunho') return 4
  if (post.wizardStep === 2 || post.wizardStep === 3 || post.wizardStep === 4) {
    return post.wizardStep
  }
  return 1
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function postWhenLabel(post: SocialLibraryPost, now = new Date()) {
  if (post.status === 'gerando') return 'leva cerca de 1 min'
  if (post.status === 'agendado' && post.scheduledAt) {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(new Date(post.scheduledAt))
      .replace('.', '')
  }
  if (post.status === 'publicado' && post.publishedAt) {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
      .format(new Date(post.publishedAt))
      .replace('.', '')
  }
  const created = new Date(post.createdAt)
  const updated = new Date(post.updatedAt)
  const edited = updated.getTime() - created.getTime() > 60_000
  const stamp = edited ? updated : created
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (!edited && sameDay(created, now)) return 'criado hoje'
  if (edited && sameDay(updated, yesterday)) return 'editado ontem'
  const day = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
    .format(stamp)
    .replace('.', '')
  return edited ? `editado ${day}` : `criado ${day}`
}
