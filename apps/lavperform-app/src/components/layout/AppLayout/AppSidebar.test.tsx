import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { Provider } from '@/components'
import { useColorMode } from '@/components/ui/color-mode'
import { NAV_NEW_BADGE_COLOR } from '@/theme'
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

function ThemeHarness({ path }: { path: string }) {
  const { setColorMode } = useColorMode()
  return (
    <>
      <button
        onClick={() => setColorMode('dark')}
        type="button"
      >
        modo escuro
      </button>
      <button
        onClick={() => setColorMode('light')}
        type="button"
      >
        modo claro
      </button>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar
          menuItems={menuWithMyPage()}
          open
        />
      </MemoryRouter>
    </>
  )
}

function contrast(foreground: string, background: string) {
  const channel = (value: number) => {
    const ratio = value / 255
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  }
  const luminance = (hex: string) => {
    const normalized = hex.replace('#', '')
    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
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
      'Tráfego',
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
    const novo = screen.getByTestId('nav-badge-/settings/brand-identity')
    const novidade = screen.getByTestId('nav-badge-/social')
    expect(novo).toHaveStyle({ background: 'var(--chakra-colors-nav-new-badge)' })
    expect(novidade).toHaveStyle({ background: 'var(--chakra-colors-nav-new-badge)' })
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

  it('troca as cores do sidebar entre claro e escuro', async () => {
    render(
      <Provider
        defaultTheme="light"
        enableSystem={false}
      >
        <ThemeHarness path="/settings/brand-identity" />
      </Provider>
    )
    const sidebar = () => screen.getByTestId('app-sidebar')
    const expectSharedBadge = () => {
      for (const testId of ['nav-badge-/settings/brand-identity', 'nav-badge-/social']) {
        expect(screen.getByTestId(testId)).toHaveStyle({
          background: 'var(--chakra-colors-nav-new-badge)',
        })
      }
    }
    await waitFor(() => expect(sidebar()).toHaveAttribute('data-sidebar-bg', 'white'))
    expectSharedBadge()
    expect(sidebar()).toHaveAttribute('data-sidebar-hover', 'gray.100')
    expect(sidebar()).toHaveAttribute('data-sidebar-sub', '#E8F6FD')

    fireEvent.click(screen.getByRole('button', { name: 'modo escuro' }))
    await waitFor(() => expect(sidebar()).toHaveAttribute('data-sidebar-bg', 'gray.900'))
    expectSharedBadge()
    expect(sidebar()).toHaveAttribute('data-sidebar-hover', 'whiteAlpha.100')
    expect(sidebar()).toHaveAttribute('data-sidebar-sub', 'rgba(123,201,241,0.16)')

    fireEvent.click(screen.getByRole('button', { name: 'modo claro' }))
    await waitFor(() => expect(sidebar()).toHaveAttribute('data-sidebar-bg', 'white'))
  })

  it('mantém contraste de pelo menos 4,5:1 no texto do sidebar escuro', () => {
    const ratios = {
      inativo: contrast('#D4D4D8', '#18181B'),
      icone: contrast('#A1A1AA', '#18181B'),
      hover: contrast('#D4D4D8', '#2F2F32'),
      ativo: contrast('#18181B', '#7BC9F1'),
      subitem: contrast('#7BC9F1', '#28343D'),
      academy: contrast('#A1A1AA', '#18181B'),
      badge: contrast('#FFFFFF', NAV_NEW_BADGE_COLOR),
    }
    for (const ratio of Object.values(ratios)) {
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    }
  })
})
