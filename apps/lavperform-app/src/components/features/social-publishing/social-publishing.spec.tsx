import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'

import { ChannelCards } from './ChannelCards'
import { monthWeeks, weekContaining, weekRangeLabel, weekSlot } from './monthGrid'
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
    expect(weeks.flat()).toHaveLength(35)
  })

  it('rotula a semana real de 1 a 7 de novembro de 2026', () => {
    expect(weekRangeLabel(weekContaining('2026-11-05'))).toBe('1 – 7 de novembro')
    expect(weekSlot('2026-11-05T15:30:00.000Z')).toBe('12:00')
    expect(weekSlot('2026-11-06T21:00:00.000Z')).toBe('18:00')
    expect(weekSlot('2026-11-07T00:00:00.000Z')).toBe('21:00')
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

describe('visão semanal', () => {
  it('mostra o eixo de horário e avança sete dias', () => {
    render(
      <Provider>
        <MemoryRouter>
          <PostCalendar
            now={new Date('2026-11-05T15:00:00.000Z')}
            onCancel={vi.fn()}
            onRetry={vi.fn()}
            onSave={vi.fn()}
            posts={[
              {
                id: 'post-semana',
                companyId: 'c',
                draftId: null,
                variationId: null,
                channels: ['INSTAGRAM'],
                caption: 'Dica: tênis',
                headline: 'Dica: tênis',
                scheduledAt: '2026-11-05T15:30:00.000Z',
                status: 'PUBLISHED',
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
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByText('1 – 7 de novembro')).toBeInTheDocument()
    for (const hour of ['09:00', '12:00', '15:00', '18:00', '21:00']) {
      expect(screen.getByText(hour)).toBeInTheDocument()
    }
    const slot = document.querySelector('[data-slot="2026-11-05|12:00"]')
    expect(slot?.textContent).toContain('Dica: tênis')
    expect(slot?.textContent).toContain('12:30 · IG')
    expect(screen.getByTestId('week-grid').querySelectorAll('[data-slot]')).toHaveLength(35)
    fireEvent.click(screen.getByRole('button', { name: 'Próxima semana' }))
    expect(screen.getByText('8 – 14 de novembro')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="2026-11-05|12:00"]')).toBeNull()
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
