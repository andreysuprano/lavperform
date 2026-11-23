import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'

import { TrafficReportPage } from './index'

const auth = vi.hoisted(() => ({
  permissions: undefined as string[] | undefined,
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    selectedCompany: { id: 'company-1', permissions: auth.permissions },
  }),
}))

function renderPage() {
  render(
    <Provider>
      <MemoryRouter>
        <TrafficReportPage />
      </MemoryRouter>
    </Provider>
  )
}

describe('Relatório de tráfego', () => {
  afterEach(() => {
    cleanup()
    auth.permissions = undefined
  })

  it('mostra o empty state e leva para configurar Pixel e Tag Manager', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Relatório de tráfego' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Seu relatório de tráfego pago vai aparecer aqui',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Instalar o Pixel da Meta/ })
    ).toHaveAttribute('href', '/trafego/pixel')
    expect(
      screen.getByRole('link', { name: /Conectar o Tag Manager/ })
    ).toHaveAttribute('href', '/trafego/gtm')
  })

  it('não oferece configuração a quem só pode ver o relatório', () => {
    auth.permissions = ['traffic.read']
    renderPage()

    expect(
      screen.getByRole('heading', {
        name: 'Seu relatório de tráfego pago vai aparecer aqui',
      })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
