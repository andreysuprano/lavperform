import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { Provider } from '@/components'
import { invalidateQueries } from '@/lib/react-query'
import { aiAgentService } from '@/whitelabel/services'

import { AIAgentConfiguratorPage } from './index'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
}))

vi.mock('@/whitelabel/services', () => ({
  aiAgentService: {
    listConfiguratorTurns: vi.fn().mockResolvedValue({ data: [] }),
    acceptConfiguratorProposal: vi.fn().mockResolvedValue({ data: { status: 'accepted' } }),
  },
}))

vi.mock('@/whitelabel/hooks', () => ({
  useAIAgent: () => ({
    data: {
      id: 'agent-1',
      name: 'Lia',
      active: true,
      companyId: 'company-1',
    },
  }),
}))

vi.mock('@/whitelabel/components/ai-agent/AIAgentAdvancedConfigDrawer', () => ({
  AIAgentAdvancedConfigDrawer: () => null,
}))

describe('AIAgentConfiguratorPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('mostra o título, as conversas e o campo de mensagem', async () => {
    render(
      <Provider>
        <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1/conversa']}>
          <Routes>
            <Route path="/whitelabel/ai-agent/:agentId/conversa" element={<AIAgentConfiguratorPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByPlaceholderText('Escreva uma mensagem...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conversas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    expect(screen.getByText('Configurar agente')).toBeInTheDocument()
    expect(screen.getByText('Testar')).toBeInTheDocument()
    const avancada = screen.getByRole('button', { name: 'Configuração avançada' })
    const conversas = screen.getByRole('button', { name: 'Conversas' })
    expect(
      screen.getByText('Testar').compareDocumentPosition(avancada) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      avancada.compareDocumentPosition(conversas) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.queryByText('Testar agente')).not.toBeInTheDocument()
  })

  it('mostra o chat de teste ao lado quando o interruptor está ligado', async () => {
    render(
      <Provider>
        <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1/conversa?teste=1']}>
          <Routes>
            <Route path="/whitelabel/ai-agent/:agentId/conversa" element={<AIAgentConfiguratorPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText('Testar agente')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('Escreva uma mensagem...')).toHaveLength(2)
  })

  it('mostra o que muda no contexto e, ao aceitar, recarrega os dados do agente', async () => {
    vi.mocked(aiAgentService.listConfiguratorTurns).mockResolvedValueOnce({
      data: [
        {
          id: 'msg-1',
          role: 'ASSISTANT',
          content: 'Confira.',
          createdAt: '2026-11-27T12:00:00.000Z',
          blocks: [
            {
              type: 'proposal',
              messageId: 'msg-1',
              behavior: 'Passa a abrir às 7h.',
              status: 'pending',
              changes: [
                { before: 'Abre às 8h', after: 'Abre às 7h' },
                { before: '', after: 'Peça o nome antes de tudo.' },
              ],
            },
          ],
        },
      ],
    } as never)
    const invalidate = vi.spyOn(invalidateQueries, 'aiAgentDetail').mockResolvedValue(undefined)

    render(
      <Provider>
        <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1/conversa']}>
          <Routes>
            <Route path="/whitelabel/ai-agent/:agentId/conversa" element={<AIAgentConfiguratorPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText('Abre às 8h')).toBeInTheDocument()
    expect(screen.getByText('Abre às 7h')).toBeInTheDocument()
    expect(screen.getByText('Peça o nome antes de tudo.')).toBeInTheDocument()
    expect(screen.getByText('Ainda não foi gravado. Confira e toque em Aceitar.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }))

    expect(await screen.findByText('Alteração gravada.')).toBeInTheDocument()
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith('company-1', 'agent-1'))
  })
})
