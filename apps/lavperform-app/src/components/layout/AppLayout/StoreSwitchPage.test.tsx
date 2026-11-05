import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'
import type { UserCompany } from '@/types'

import { StoreSwitchPage } from './StoreSwitchPage'

const selectCompany = vi.fn()

const logo = 'https://firebasestorage.googleapis.com/v0/b/app/o/acqua.png'

function company(partial: Partial<UserCompany> & Pick<UserCompany, 'id' | 'name'>): UserCompany {
  return {
    avatarUrl: logo,
    slug: partial.slug ?? partial.id,
    companyId: partial.id,
    showIncentivizedSales: false,
    showTodayPurchases: false,
    serviceModel: 'CONVENTIONAL',
    ...partial,
  }
}

const companies = [
  company({
    id: 'acqua',
    name: 'Acqua Express - Brasília-DF',
    slug: 'acqua-express-brasilia',
  }),
  company({
    id: 'lav',
    name: '#1 Lavanderia Express - Barra de São Francisco-ES',
    avatarUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/lav.png',
    slug: '1-lavanderia-express',
  }),
]

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    companies,
    selectedCompany: companies[0],
    selectCompany,
  }),
}))

describe('troca de loja no celular', () => {
  afterEach(() => {
    cleanup()
    selectCompany.mockClear()
  })

  it('mostra a logo de cada loja, sem agrupar por empresa', () => {
    render(
      <Provider>
        <StoreSwitchPage />
      </Provider>
    )

    const images = document.querySelectorAll('img')
    expect(images[0]).toHaveAttribute('alt', 'Acqua Express - Brasília-DF')
    expect(images[0]).toHaveAttribute('src', logo)
    expect(images[1]).toHaveAttribute(
      'alt',
      '#1 Lavanderia Express - Barra de São Francisco-ES'
    )
    expect(screen.queryByText('1 loja')).not.toBeInTheDocument()
    expect(screen.queryByText('acqua-express-brasilia')).not.toBeInTheDocument()
  })

  it('filtra pelo nome e troca a loja ao toque', () => {
    render(
      <Provider>
        <StoreSwitchPage />
      </Provider>
    )

    fireEvent.change(screen.getByLabelText('Buscar loja ou cidade'), {
      target: { value: 'barra' },
    })

    expect(screen.queryByText('Acqua Express - Brasília-DF')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Lavanderia Express/ }))
    expect(selectCompany).toHaveBeenCalledWith('lav')
  })
})
