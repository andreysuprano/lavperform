import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'

import { ChannelCards } from './ChannelCards'
import { monthWeeks } from './monthGrid'
import { PostCalendar } from './PostCalendar'

afterEach(() => cleanup())

describe('calendário mensal', () => {
  it('abre 6 semanas quando o mês começa no sábado e tem 31 dias', () => {
    const weeks = monthWeeks(2026, 7)
    expect(weeks).toHaveLength(6)
    const last = weeks[5].map((cell) => cell.day)
    expect(last).toContain(30)
    expect(last).toContain(31)
    expect(weeks[5].some((cell) => cell.date === '2026-08-30' && cell.inMonth)).toBe(true)
    expect(weeks[5].some((cell) => cell.date === '2026-08-31' && cell.inMonth)).toBe(true)
  })

  it('começa no domingo quando o dia 1 cai no domingo', () => {
    const weeks = monthWeeks(2026, 10)
    expect(weeks).toHaveLength(5)
    expect(weeks[0][0]).toMatchObject({ date: '2026-11-01', inMonth: true })
  })
})

describe('cards de conexão', () => {
  it('mostra Tentar de novo quando a conta precisa de atenção', () => {
    const onRetry = vi.fn()
    render(
      <Provider>
        <ChannelCards
          connections={[
            {
              provider: 'GOOGLE_ADS',
              status: 'ERROR',
              configured: true,
              sandbox: true,
              accountName: null,
              accountDetail: null,
              lastError: 'Não conseguimos acessar o Google Ads agora.',
              metrics: null,
            },
          ]}
          onCancel={vi.fn()}
          onConnect={vi.fn()}
          onDisconnect={vi.fn()}
          onRetry={onRetry}
          onSwitch={vi.fn()}
        />
      </Provider>
    )
    expect(screen.getByText('Precisa de atenção')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(onRetry).toHaveBeenCalledWith('GOOGLE_ADS')
  })
})

describe('detalhe do post', () => {
  it('pede confirmação antes de cancelar', async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined)
    render(
      <Provider>
        <MemoryRouter>
          <PostCalendar
            onCancel={onCancel}
            onRetry={vi.fn()}
            onSave={vi.fn()}
            posts={[
              {
                id: 'post-1',
                companyId: 'c',
                draftId: null,
                variationId: null,
                channels: ['FACEBOOK'],
                caption: 'Promoção de teste',
                headline: 'Promoção de teste',
                scheduledAt: '2026-11-07T21:30:00.000Z',
                status: 'SCHEDULED',
                publishedAt: null,
                attemptCount: 0,
                maxAttempts: 3,
                lastError: null,
                sandbox: true,
              },
            ]}
          />
        </MemoryRouter>
      </Provider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Promoção de teste' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('Cancelar este post?')).toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar post' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
