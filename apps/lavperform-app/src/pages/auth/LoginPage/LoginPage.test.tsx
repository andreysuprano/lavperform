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
const toasterCreate = vi.hoisted(() => vi.fn())

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ signIn }),
}))

vi.mock('@/components', () => ({
  toaster: { create: toasterCreate },
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
    toasterCreate.mockReset()
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

  async function submitValidLogin() {
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'marina@bolhaazul.com.br' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'segredo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  }

  it('mantém a validação local sem chamar a API', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe o e-mail')).toBeVisible()
    expect(screen.getByText('Informe a senha')).toBeVisible()
    expect(signIn).not.toHaveBeenCalled()
    expect(toasterCreate).not.toHaveBeenCalled()
  })

  it('mantém o erro de credencial quando a API responde', async () => {
    signIn.mockRejectedValue({
      response: {
        status: 401,
        data: {
          message: 'Usuário ou senha incorretos. Verifique e tente novamente.',
        },
      },
    })
    renderLogin()

    await submitValidLogin()

    await waitFor(() => {
      expect(toasterCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao realizar login',
          description: 'Email ou senha incorretos. Por favor, tente novamente.',
        })
      )
    })
    expect(toasterCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Não foi possível conectar. Tente novamente.',
      })
    )
    expect(screen.getByLabelText('E-mail')).toHaveValue(
      'marina@bolhaazul.com.br'
    )
  })

  it('mantém o erro atual quando a API responde validação', async () => {
    signIn.mockRejectedValue({
      response: {
        status: 400,
        data: { message: ['email must be an email'], statusCode: 400 },
      },
    })
    renderLogin()

    await submitValidLogin()

    await waitFor(() => {
      expect(toasterCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Email ou senha incorretos. Por favor, tente novamente.',
        })
      )
    })
  })

  it.each([
    ['rede', { message: 'Network Error', code: 'ERR_NETWORK' }],
    [
      'CORS',
      { message: 'Network Error', code: 'ERR_NETWORK', response: undefined },
    ],
    [
      'timeout',
      { message: 'timeout of 10000ms exceeded', code: 'ECONNABORTED' },
    ],
    ['status zero sem body', { response: { status: 0, data: '' } }],
    ['erro sem resposta', new Error('falha')],
  ])(
    'mostra o toast genérico quando o login falha por %s',
    async (_label, error) => {
      signIn.mockRejectedValue(error)
      renderLogin()

      await submitValidLogin()

      await waitFor(() => {
        expect(toasterCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Não foi possível conectar. Tente novamente.',
            type: 'error',
          })
        )
      })
      expect(toasterCreate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Email ou senha incorretos. Por favor, tente novamente.',
        })
      )
      expect(screen.getByLabelText('E-mail')).toHaveValue(
        'marina@bolhaazul.com.br'
      )
      expect(screen.getByLabelText('Senha')).toHaveValue('segredo')
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    }
  )
})
