import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { Provider } from '@/components'

import { AIAgentPlaygroundPage } from './index'

const sendPlaygroundTurn = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
}))

vi.mock('@/whitelabel/services', () => ({
  aiAgentService: {
    sendPlaygroundTurn: (...args: unknown[]) => sendPlaygroundTurn(...args),
  },
}))

function renderPage() {
  return render(
    <Provider>
      <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1/teste']}>
        <Routes>
          <Route path="/whitelabel/ai-agent/:agentId/teste" element={<AIAgentPlaygroundPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe('AIAgentPlaygroundPage', () => {
  afterEach(() => {
    cleanup()
    sendPlaygroundTurn.mockReset()
  })

  it('abre com o campo e o botão de enviar, sem buscar histórico', async () => {
    renderPage()

    expect(await screen.findByPlaceholderText('Escreva uma mensagem...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conversas' })).toBeInTheDocument()
    expect(screen.getByText('Testar agente')).toBeInTheDocument()
    expect(sendPlaygroundTurn).not.toHaveBeenCalled()
  })

  it('mostra a fala de quem testa e depois a resposta', async () => {
    sendPlaygroundTurn.mockResolvedValue({ data: { content: 'Abrimos às 8h' } })
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Escreva uma mensagem...'), {
      target: { value: 'Qual o horário?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Qual o horário?')).toBeInTheDocument()
    expect(await screen.findByText('Abrimos às 8h')).toBeInTheDocument()
    expect(sendPlaygroundTurn).toHaveBeenCalledWith(
      'company-1',
      'agent-1',
      expect.objectContaining({ content: 'Qual o horário?', history: [] }),
      expect.any(AbortSignal)
    )
  })

  it('desliga o campo enquanto espera a resposta', async () => {
    let finish: (value: { data: { content: string } }) => void = () => undefined
    sendPlaygroundTurn.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Escreva uma mensagem...'), {
      target: { value: 'Oi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Respondendo')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Escreva uma mensagem...')).toBeDisabled()

    finish({ data: { content: 'Olá' } })
    expect(await screen.findByText('Olá')).toBeInTheDocument()
  })

  it('mostra a falha e permite escrever de novo', async () => {
    const error = new AxiosError('fail')
    error.response = { status: 502, data: { message: 'A resposta falhou.' } } as AxiosError['response']
    sendPlaygroundTurn.mockRejectedValue(error)
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Escreva uma mensagem...'), {
      target: { value: 'Oi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('A resposta falhou.')).toBeInTheDocument()
    expect(screen.getByText('Oi')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Escreva uma mensagem...')).toBeEnabled()
  })

  it('fecha o campo quando o teste está indisponível', async () => {
    const error = new AxiosError('missing')
    error.response = { status: 404, data: { message: 'O teste não está disponível.' } } as AxiosError['response']
    sendPlaygroundTurn.mockRejectedValue(error)
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Escreva uma mensagem...'), {
      target: { value: 'Oi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('O teste não está disponível.')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Escreva uma mensagem...')).not.toBeInTheDocument()
  })

  it('mostra a passagem para um humano', async () => {
    sendPlaygroundTurn.mockResolvedValue({
      data: { content: 'O atendimento foi passado para um humano.' },
    })
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Escreva uma mensagem...'), {
      target: { value: 'Quero um atendente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('O atendimento foi passado para um humano.')).toBeInTheDocument()
  })
})
