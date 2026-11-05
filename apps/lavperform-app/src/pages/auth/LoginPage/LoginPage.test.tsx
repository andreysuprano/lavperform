import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from './index'

const signIn = vi.hoisted(() => vi.fn())

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ signIn }),
}))

vi.mock('@/components', () => ({
  toaster: { create: vi.fn() },
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('tela de login', () => {
  afterEach(() => {
    cleanup()
    signIn.mockReset()
  })

  it('mostra logo, título, rótulos, Entrar e Esqueci minha senha', () => {
    renderLogin()

    expect(screen.getByRole('img', { name: 'LavPerform' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Entrar na sua conta' })
    ).toBeVisible()
    expect(screen.getByText('E-mail', { selector: 'label' })).toBeVisible()
    expect(screen.getByText('Senha', { selector: 'label' })).toBeVisible()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'placeholder',
      'E-mail'
    )
    expect(screen.getByLabelText('Senha')).toHaveAttribute(
      'placeholder',
      'Senha'
    )
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Esqueci minha senha' })
    ).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByText('Acesse sua conta')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Revolucione a comunicação com seus clientes')
    ).not.toBeInTheDocument()
  })

  it('entra com e-mail e senha e alterna a visibilidade da senha', async () => {
    signIn.mockResolvedValue(undefined)
    renderLogin()

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'marina@bolhaazul.com.br' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'segredo' },
    })
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    expect(signIn).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: 'marina@bolhaazul.com.br',
        password: 'segredo',
      })
    })
  })
})
