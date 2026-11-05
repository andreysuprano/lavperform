import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Audience, CreateAudienceRequest } from '@/types'

import { useAudiences, useCreateAudience } from './useAudiences'

const store = vi.hoisted(() => ({
  items: [] as Audience[],
}))

vi.mock('@/services/audience.service', () => ({
  audienceService: {
    list: vi.fn(async () => ({
      data: {
        data: store.items.map((item) => ({ ...item })),
        meta: {
          total: store.items.length,
          page: 1,
          limit: 100,
          totalPages: 1,
        },
      },
    })),
    create: vi.fn(async (_companyId: string, body: CreateAudienceRequest) => {
      const created: Audience = {
        id: 'audiencia-nova',
        companyId: 'company-1',
        name: body.name,
        description: body.description ?? null,
        definition: body.definition,
        customerCount: 12,
        createdAt: '2026-11-05T14:00:00.000Z',
        updatedAt: '2026-11-05T14:00:00.000Z',
      }
      store.items = [created, ...store.items]
      return { data: created }
    }),
  },
}))

const existingAudience: Audience = {
  id: 'audiencia-antiga',
  companyId: 'company-1',
  name: 'Clientes geral',
  description: null,
  definition: {
    version: 1,
    include: {
      operator: 'AND',
      rules: [{ type: 'last_order_days', operator: 'gte', value: 30 }],
    },
  },
  customerCount: 1687,
  createdAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
}

const newAudienceRequest: CreateAudienceRequest = {
  name: 'Aniversariantes de novembro',
  description: '',
  definition: {
    version: 1,
    include: {
      operator: 'AND',
      rules: [{ type: 'birthday_in_month', operator: 'eq', value: 11 }],
    },
  },
}

function renderWithClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  return { wrapper }
}

describe('cache da lista de audiências', () => {
  beforeEach(() => {
    store.items = [{ ...existingAudience }]
  })

  it('mantém as audiências anteriores e mostra a nova no seletor da campanha sem recarregar a página', async () => {
    const { wrapper } = renderWithClient()

    const campaignSelect = renderHook(
      () => useAudiences('company-1', { page: 1, limit: 100 }),
      { wrapper },
    )
    await waitFor(() => {
      expect(campaignSelect.result.current.isFetching).toBe(false)
      expect(campaignSelect.result.current.data?.data.map((item) => item.name)).toEqual([
        'Clientes geral',
      ])
    })
    campaignSelect.unmount()

    const audiencesPage = renderHook(
      () => useAudiences('company-1', { page: 1, limit: 50 }),
      { wrapper },
    )
    await waitFor(() => {
      expect(audiencesPage.result.current.isFetching).toBe(false)
      expect(audiencesPage.result.current.data?.data).toHaveLength(1)
    })

    const create = renderHook(() => useCreateAudience(), { wrapper })
    await create.result.current.mutateAsync({
      companyId: 'company-1',
      data: newAudienceRequest,
    })

    await waitFor(() => {
      expect(audiencesPage.result.current.data?.data.map((item) => item.name)).toEqual([
        'Aniversariantes de novembro',
        'Clientes geral',
      ])
    })
    audiencesPage.unmount()

    const campaignSelectAgain = renderHook(
      () => useAudiences('company-1', { page: 1, limit: 100 }),
      { wrapper },
    )

    await waitFor(() => {
      expect(
        campaignSelectAgain.result.current.data?.data.map((item) => item.name),
      ).toEqual(['Aniversariantes de novembro', 'Clientes geral'])
    })
  })
})
