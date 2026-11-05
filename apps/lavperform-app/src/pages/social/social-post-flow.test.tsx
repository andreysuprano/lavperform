import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'
import { BrandIdentityPage } from '@/pages/settings/BrandIdentityPage'
import { SocialEditorPage } from '@/pages/social/SocialEditorPage'
import { SocialGeneratorPage } from '@/pages/social/SocialGeneratorPage'
import { SocialRevisionPage } from '@/pages/social/SocialRevisionPage'
import { SocialVariationsPage } from '@/pages/social/SocialVariationsPage'
const COMPANY = '11111111-1111-1111-1111-111111111111'
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const { store, service, emptyBrand } = vi.hoisted(() => {
  const emptyBrand = {
    logoLightUrl: null,
    logoDarkUrl: null,
    primaryColor: '#7BC9F1',
    deepColor: '#093A58',
    accentColor: '#FFD23F',
    neutralColor: '#FFFFFF',
    titleFont: 'Poppins',
    bodyFont: 'Inter',
    tones: ['Próximo'],
    voiceNotes: null,
    references: null,
  }
  const store = {
    brand: {
      ...emptyBrand,
      id: null as string | null,
      companyId: '11111111-1111-1111-1111-111111111111',
      persisted: false,
    },
    drafts: new Map<string, any>(),
  }

  const variation = (position: number, headline: string) => ({
    id: `var-${position}-${Math.random().toString(16).slice(2)}`,
    position,
    headline,
    badgeText: '20% OFF',
    captionShort: 'Legenda curta da lavanderia',
    captionMedium: 'Legenda média com o tom da marca',
    captionLong:
      'Legenda longa contando a oferta de edredom e a coleta no bairro.',
    activeCaption: 'medium',
    hashtags: ['#lavanderia', '#edredom'],
    slides: [
      {
        backgroundImage: TINY_PNG,
        layers: [
          {
            id: 'background',
            type: 'background',
            label: 'Arte de fundo (IA)',
            x: 0,
            y: 0,
            locked: true,
            visible: true,
          },
          {
            id: 'logo',
            type: 'logo',
            label: 'Logo',
            x: 50,
            y: 8,
            width: 28,
            locked: false,
            visible: true,
            logoVariant: 'light',
          },
          {
            id: 'title',
            type: 'title',
            label: 'Título',
            text: headline,
            fontFamily: 'Poppins',
            fontSize: 46,
            color: '#FFFFFF',
            x: 50,
            y: 62,
            width: 84,
            locked: false,
            visible: true,
          },
        ],
      },
    ],
  })

  const findVariation = (variationId: string) => {
    for (const draft of store.drafts.values()) {
      const found = draft.variations.find(
        (item: { id: string }) => item.id === variationId
      )
      if (found) return found
    }
    throw new Error('variação ausente')
  }

  const service = {
    getBrand: vi.fn(async () => ({ data: store.brand })),
    saveBrand: vi.fn(async (_companyId: string, payload: object) => {
      store.brand = {
        ...store.brand,
        ...payload,
        id: 'brand-1',
        persisted: true,
      }
      return { data: store.brand }
    }),
    listDrafts: vi.fn(async () => ({ data: [] })),
    createDraft: vi.fn(async (payload: Record<string, unknown>) => {
      const draft = {
        id: `draft-${store.drafts.size + 1}`,
        selectedVariationId: null,
        variations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload,
      }
      store.drafts.set(draft.id, draft)
      return { data: draft }
    }),
    getDraft: vi.fn(async (id: string) => ({
      data: JSON.parse(JSON.stringify(store.drafts.get(id))),
    })),
    generate: vi.fn(async (id: string) => {
      const draft = store.drafts.get(id)
      draft.variations = [0, 1, 2, 3].map((position) =>
        variation(
          position,
          position === 0 ? 'Edredom novo de novo.' : `Oferta ${position + 1}`
        )
      )
      draft.selectedVariationId = draft.variations[0].id
      return { data: draft }
    }),
    generateMore: vi.fn(async (id: string) => ({ data: store.drafts.get(id) })),
    selectVariation: vi.fn(async (draftId: string, variationId: string) => {
      const draft = store.drafts.get(draftId)
      draft.selectedVariationId = variationId
      return { data: draft }
    }),
    updateVariation: vi.fn(async (variationId: string, payload: any) => {
      const current = findVariation(variationId)
      if (payload.layers) {
        current.slides[payload.slideIndex ?? 0].layers = payload.layers
      }
      if (payload.headline) {
        current.headline = payload.headline
        const title = current.slides[0].layers.find(
          (layer: { type: string }) => layer.type === 'title'
        )
        if (title) title.text = payload.headline
      }
      if (payload.captionMedium) current.captionMedium = payload.captionMedium
      if (payload.activeCaption) current.activeCaption = payload.activeCaption
      return { data: current }
    }),
    regenerateBackground: vi.fn(async (variationId: string) => ({
      data: findVariation(variationId),
    })),
    rewriteCaption: vi.fn(async (variationId: string) => ({
      data: findVariation(variationId),
    })),
    revise: vi.fn(async (variationId: string, prompt: string) => {
      if (prompt.trim().length < 3 || !/[a-zA-ZÀ-ÿ]{2,}/.test(prompt)) {
        throw new Error(
          'Escreva o que você quer mudar no fundo, no título ou na legenda.'
        )
      }
      const current = findVariation(variationId)
      if (!current.versions?.length) {
        current.versions = [
          {
            id: `${current.id}-v1`,
            number: 1,
            source: 'generation',
            prompt: null,
            assistantReply: 'Versão inicial pronta.',
            headline: current.headline,
            badgeText: current.badgeText,
            captionShort: current.captionShort,
            captionMedium: current.captionMedium,
            captionLong: current.captionLong,
            activeCaption: current.activeCaption,
            hashtags: current.hashtags,
            slides: current.slides,
          },
        ]
      }
      const titleChange = /título|titulo/i.test(prompt)
      const backgroundChange = /fundo/i.test(prompt)
      const previous = current.versions[current.versions.length - 1]
      const slides = previous.slides.map((slide: any) => ({
        backgroundImage: backgroundChange
          ? `${TINY_PNG}-novo`
          : slide.backgroundImage,
        layers: slide.layers.map((layer: any) =>
          layer.type === 'title' && titleChange
            ? { ...layer, text: 'Coleta grátis hoje' }
            : { ...layer }
        ),
      }))
      const version = {
        id: `${current.id}-v${current.versions.length + 1}`,
        number: current.versions.length + 1,
        source: 'revision',
        prompt,
        assistantReply: titleChange
          ? 'Atualizei o título.'
          : backgroundChange
            ? 'Mudei o fundo.'
            : 'Atualizei a legenda.',
        headline: titleChange ? 'Coleta grátis hoje' : previous.headline,
        badgeText: previous.badgeText,
        captionShort: previous.captionShort,
        captionMedium: previous.captionMedium,
        captionLong: previous.captionLong,
        activeCaption: previous.activeCaption,
        hashtags: previous.hashtags,
        slides,
      }
      current.versions = [...current.versions, version]
      current.selectedVersionId = version.id
      current.headline = version.headline
      current.slides = slides
      return {
        data: JSON.parse(
          JSON.stringify(
            [...store.drafts.values()].find((item) =>
              item.variations.some(
                (entry: { id: string }) => entry.id === variationId
              )
            )
          )
        ),
      }
    }),
    selectVersion: vi.fn(async (variationId: string, versionId: string) => {
      const current = findVariation(variationId)
      const version = current.versions.find((item: { id: string }) => item.id === versionId)
      current.selectedVersionId = versionId
      current.headline = version.headline
      current.slides = version.slides
      return {
        data: JSON.parse(
          JSON.stringify(
            [...store.drafts.values()].find((item) =>
              item.variations.some(
                (entry: { id: string }) => entry.id === variationId
              )
            )
          )
        ),
      }
    }),
    restoreVersion: vi.fn(async (variationId: string, versionId: string) => {
      const current = findVariation(variationId)
      const source = current.versions.find((item: { id: string }) => item.id === versionId)
      const kept = current.versions.length
      const version = {
        ...source,
        id: `${current.id}-v${kept + 1}`,
        number: kept + 1,
        source: 'restore',
        prompt: null,
        assistantReply: `Voltei para a versão ${source.number}.`,
      }
      current.versions = [...current.versions, version]
      current.selectedVersionId = version.id
      current.headline = version.headline
      current.slides = version.slides
      expect(current.versions).toHaveLength(kept + 1)
      return {
        data: JSON.parse(
          JSON.stringify(
            [...store.drafts.values()].find((item) =>
              item.variations.some(
                (entry: { id: string }) => entry.id === variationId
              )
            )
          )
        ),
      }
    }),
    recordManual: vi.fn(async (variationId: string, payload: any) => {
      const current = findVariation(variationId)
      if (!current.versions?.length) current.versions = []
      const version = {
        id: `${current.id}-manual`,
        number: current.versions.length + 1,
        source: 'manual',
        prompt: null,
        assistantReply: 'Ajuste manual salvo.',
        headline: payload.headline,
        slides: [
          {
            backgroundImage: current.slides[0].backgroundImage,
            layers: payload.layers,
          },
        ],
        captionMedium: current.captionMedium,
        captionShort: current.captionShort,
        captionLong: current.captionLong,
        activeCaption: current.activeCaption,
        hashtags: current.hashtags,
        badgeText: current.badgeText,
      }
      current.versions = [...current.versions, version]
      current.selectedVersionId = version.id
      current.headline = version.headline
      current.slides = version.slides
      return { data: [...store.drafts.values()][0] }
    }),
  }

  return { store, service, emptyBrand }
})

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    selectedCompany: { id: COMPANY, name: 'Lavanderia Bolha Azul' },
  }),
}))

vi.mock('@/services/socialPublishing.service', () => ({
  socialPublishingService: {
    connections: vi.fn().mockResolvedValue({
      data: {
        sandbox: false,
        metaConfigured: false,
        googleConfigured: false,
        googleAdsConfigured: false,
        connections: [],
      },
    }),
    suggestions: vi.fn().mockResolvedValue({
      data: {
        slots: [
          {
            id: 'friday-1830',
            label: 'Sex 18:30 · melhor horário',
            at: '2026-11-06T21:30:00.000Z',
            best: true,
          },
        ],
      },
    }),
    createPost: vi.fn(),
    posts: vi.fn().mockResolvedValue({ data: [] }),
    googleProfile: vi.fn(),
  },
  publishingErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

vi.mock('@/services/socialPosts.service', () => ({
  socialPostsService: service,
  apiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
}))

const downloads: Blob[] = []

function renderFlow(path = '/settings/brand-identity') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <Provider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              element={<BrandIdentityPage />}
              path="/settings/brand-identity"
            />
            <Route
              element={<SocialGeneratorPage />}
              path="/social/generator"
            />
            <Route
              element={<SocialVariationsPage />}
              path="/social/generator/:draftId"
            />
            <Route
              element={<SocialRevisionPage />}
              path="/social/revise/:draftId/:variationId"
            />
            <Route
              element={<SocialEditorPage />}
              path="/social/editor/:draftId/:variationId"
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  )
}

describe('fluxo de post com IA', () => {
  beforeEach(() => {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    store.drafts.clear()
    store.brand = {
      ...emptyBrand,
      id: null,
      companyId: COMPANY,
      persisted: false,
    }
    downloads.length = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (blob: Blob | MediaSource) => {
        if (blob instanceof Blob) downloads.push(blob)
        return 'blob:post'
      }
    )
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      () => undefined
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it.each([1, 2, 3])(
    'rodada %s: identidade, briefing, variações, editor e download',
    async () => {
      renderFlow()

      fireEvent.change(await screen.findByTestId('identity-deepColor'), {
        target: { value: '#0b2540' },
      })
      fireEvent.click(screen.getByTestId('identity-save'))
      await waitFor(() => expect(store.brand.deepColor).toBe('#0b2540'))

      fireEvent.click(
        screen.getByRole('link', { name: 'Abrir gerador de posts' })
      )
      const theme = await screen.findByTestId('briefing-theme')
      fireEvent.change(theme, {
        target: {
          value: '20% de desconto na lavagem de edredons toda sexta no Batel',
        },
      })
      fireEvent.click(screen.getByTestId('briefing-generate'))

      expect(await screen.findByText('Variação 1')).toBeInTheDocument()
      expect(screen.getByText('Edredom novo de novo.')).toBeInTheDocument()
      fireEvent.click(screen.getAllByRole('button', { name: 'Revisar' })[0])
      expect(await screen.findByText('Revisar com IA')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('copy-caption'))
      await waitFor(() =>
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Legenda média com o tom da marca')
        )
      )

      fireEvent.click(screen.getByRole('button', { name: 'Mais ações' }))
      fireEvent.click(await screen.findByTestId('open-manual-editor'))
      const title = await screen.findByTestId('layer-title')
      fireEvent.change(title, { target: { value: 'Edredom pronto hoje.' } })
      fireEvent.click(screen.getByTestId('download-post'))

      await waitFor(() => expect(downloads.length).toBeGreaterThan(0))
      const exported = await downloads[0].text()
      expect(exported).toContain('Edredom pronto hoje.')
      expect(exported).toContain(TINY_PNG)
      expect(service.generate).toHaveBeenCalled()
    }
  )

  it('mantém a identidade da marca depois de recarregar', async () => {
    renderFlow()
    fireEvent.change(await screen.findByTestId('identity-deepColor'), {
      target: { value: '#0b2540' },
    })
    fireEvent.click(screen.getByTestId('identity-save'))
    await waitFor(() => expect(store.brand.deepColor).toBe('#0b2540'))
    cleanup()

    renderFlow()
    expect(await screen.findByTestId('identity-deepColor')).toHaveValue('#0b2540')
  })

  it('avisa identidade incompleta e falha da OpenRouter', async () => {
    renderFlow('/social/generator')
    expect(await screen.findByTestId('brand-incomplete-notice')).toHaveTextContent(
      /cara da sua lavanderia/i
    )
    expect(screen.getByTestId('configure-brand')).toHaveAttribute(
      'href',
      '/settings/brand-identity'
    )
    expect(screen.queryByText('Ctrl + Enter para gerar')).not.toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('1080×1080')).toBeInTheDocument()
    expect(screen.queryByText('Como a IA monta o post')).not.toBeInTheDocument()
    expect(screen.queryByText('1. Você descreve a ideia')).not.toBeInTheDocument()
    expect(screen.getByText('Legenda e hashtags no seu tom de voz.')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('briefing-theme'), {
      target: { value: '20% de desconto na lavagem de edredons no Batel' },
    })
    service.generate.mockRejectedValueOnce(
      new Error('A OpenRouter demorou demais para responder. Tente de novo.')
    )
    fireEvent.click(screen.getByTestId('briefing-generate'))
    expect(await screen.findByTestId('generation-error')).toHaveTextContent(
      /demorou demais/i
    )
  })

  it('revisa fundo e título, guarda o histórico e baixa a versão selecionada', async () => {
    renderFlow('/social/generator')
    fireEvent.change(await screen.findByTestId('briefing-theme'), {
      target: { value: '20% de desconto na lavagem de edredons no Batel' },
    })
    fireEvent.click(screen.getByTestId('briefing-generate'))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Revisar' }))[0])
    expect(await screen.findByText('Versão inicial pronta.')).toBeInTheDocument()
    expect(screen.getByTestId('revision-send')).toBeDisabled()
    fireEvent.change(screen.getByTestId('revision-input'), { target: { value: '??' } })
    expect(screen.getByTestId('revision-send')).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Trocar título' }))
    expect(await screen.findByText('Atualizei o título.')).toBeInTheDocument()
    expect(screen.getAllByText('Coleta grátis hoje').length).toBeGreaterThan(0)
    expect(screen.getByTestId('version-1')).toBeInTheDocument()
    expect(screen.getByTestId('version-2')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('version-1'))
    expect(await screen.findByTestId('restore-version')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('restore-version'))
    expect(await screen.findByText('Voltei para a versão 1.')).toBeInTheDocument()
    expect(screen.getByTestId('version-3')).toBeInTheDocument()
    expect(screen.getByTestId('version-1')).toBeInTheDocument()

    service.revise.mockRejectedValueOnce(
      new Error('A OpenRouter demorou demais para responder. Tente de novo.')
    )
    fireEvent.click(screen.getByRole('button', { name: 'Fundo mais claro' }))
    expect(await screen.findByTestId('revision-error')).toHaveTextContent(/Tentar de novo|demorou demais/)
    expect(screen.getByTestId('version-3')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('copy-caption'))
    fireEvent.click(screen.getByTestId('download-post'))
    await waitFor(() => expect(downloads.length).toBeGreaterThan(0))
  })
})
