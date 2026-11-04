import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { Provider } from '@/components'
import { FOODCRM_MENU_ITEMS, MENU_ITEMS } from '@/utils/constants/appMenuLinks'

import { Sidebar } from './AppSidebar'

function menuWithMyPage() {
  const items = [...MENU_ITEMS]
  const ajustesIndex = items.findIndex((item) => item.href === '/settings')
  items.splice(ajustesIndex + 1, 0, ...FOODCRM_MENU_ITEMS)
  return items
}

function renderSidebar(path: string) {
  return render(
    <Provider>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar
          menuItems={menuWithMyPage()}
          open
        />
      </MemoryRouter>
    </Provider>
  )
}

describe('sidebar no formato do Figma', () => {
  afterEach(() => cleanup())

  it('mostra a ordem, o accordion e o badge Novidade sem Google nem Calendário', () => {
    renderSidebar('/social/generator')

    const labels = screen
      .getAllByRole('link')
      .map((link) =>
        link.textContent?.replace('Novidade', '').replace('Novo', '').trim()
      )
      .filter((label) => label && label !== 'Academy')

    expect(labels).toEqual([
      'Dashboard',
      'Meta ADS',
      'Fidelização e Recorrência',
      'Clientes',
      'Canais de Comunicação',
      'Integrações',
      'Redes Sociais',
      'Gerador de posts',
      'Ajustes',
      'Minha Página',
    ])
    expect(screen.getByTestId('nav-badge-/social')).toHaveTextContent('Novidade')
    expect(screen.queryByText('Calendário')).not.toBeInTheDocument()
    expect(screen.queryByText('Google Meu Negócio')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Academy' })).toBeInTheDocument()
  })

  it('abre Identidade da marca em Ajustes e mantém rotas antigas no accordion', () => {
    renderSidebar('/settings/brand-identity')
    expect(screen.getByRole('link', { name: /Identidade da marca/ })).toHaveTextContent('Novo')
    expect(screen.getByRole('link', { name: 'Carteira' })).toHaveAttribute('href', '/settings/wallet')
    expect(screen.getByRole('link', { name: 'Renitência' })).toHaveAttribute(
      'href',
      '/settings/renitency'
    )
    cleanup()

    renderSidebar('/campaigns/recurring-campaigns')
    expect(screen.getByRole('link', { name: 'Campanhas' })).toHaveAttribute(
      'href',
      '/campaigns/recurring-campaigns'
    )
    expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument()
    cleanup()

    renderSidebar('/customers/CustomerBase')
    expect(screen.getByRole('link', { name: 'Base de clientes' })).toHaveAttribute(
      'href',
      '/customers/CustomerBase'
    )
  })
})
