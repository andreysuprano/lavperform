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
    getDraft: vi.fn(async (id: string) => ({ data: store.drafts.get(id) })),
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
  }

  return { store, service, emptyBrand }
})

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    selectedCompany: { id: COMPANY, name: 'Lavanderia Bolha Azul' },
  }),
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
      fireEvent.click(screen.getByTestId('copy-caption'))
      await waitFor(() =>
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('Legenda média com o tom da marca')
        )
      )

      fireEvent.click(screen.getAllByRole('button', { name: /Editar/ })[0])
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
      /identidade da marca ainda não foi salva/i
    )

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
})
