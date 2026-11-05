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

export const WIZARD_PLACEMENTS = [
  {
    value: 'feed',
    title: 'Post no feed · quadrado',
    hint: 'Instagram e Facebook',
    format: 'feed',
  },
  {
    value: 'story',
    title: 'Story · vertical',
    hint: 'Some em 24 horas',
    format: 'story',
  },
  {
    value: 'google',
    title: 'Post no Google',
    hint: 'Aparece no seu perfil do Google Meu Negócio',
    format: 'feed',
  },
] as const

export const WIZARD_TONES = ['Amigável', 'Divertido', 'Direto', 'Profissional'] as const

export function objectiveTitle(value: string) {
  return WIZARD_OBJECTIVES.find((item) => item.value === value)?.title ?? value
}

export function placementTitle(value: string) {
  return WIZARD_PLACEMENTS.find((item) => item.value === value)?.title ?? value
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
  }
}

export function filterLibrary(posts: SocialLibraryPost[], filter: LibraryFilter) {
  const sorted = [...posts].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  )
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
