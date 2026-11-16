import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'

import { Provider } from '@/components'

import { AIAgentDetailPage } from './index'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
}))

vi.mock('@/whitelabel/hooks', () => ({
  useAIAgent: () => ({
    data: { id: 'agent-1', name: 'Lia', active: true, description: 'Atende no WhatsApp' },
    isLoading: false,
    isError: false,
  }),
  useDeleteAIAgent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleAIAgent: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAIAgentWebhook: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/whitelabel/components/ai-agent/tabs', () => ({
  ConversationsTab: () => <div>conversas</div>,
  PersonaTab: () => <div>aba persona</div>,
  MediaTab: () => <div>aba midia</div>,
  FiltersTab: () => <div>aba filtros</div>,
  JourneyTab: () => <div>aba jornada</div>,
  RagTab: () => <div>aba rag</div>,
  McpTab: () => <div>aba mcp</div>,
}))

describe('AIAgentDetailPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('abre o chat de teste do agente', async () => {
    function ChatRoute() {
      const [params] = useSearchParams()
      return <p>{params.get('teste') === '1' ? 'teste aberto' : 'chat'}</p>
    }

    render(
      <Provider>
        <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1']}>
          <Routes>
            <Route path="/whitelabel/ai-agent/:agentId" element={<AIAgentDetailPage />} />
            <Route path="/whitelabel/ai-agent/:agentId/conversa" element={<ChatRoute />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Testar' }))
    expect(await screen.findByText('teste aberto')).toBeInTheDocument()
  })

  it('abre a configuração avançada ao lado de testar', async () => {
    render(
      <Provider>
        <MemoryRouter initialEntries={['/whitelabel/ai-agent/agent-1']}>
          <Routes>
            <Route path="/whitelabel/ai-agent/:agentId" element={<AIAgentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    const testar = await screen.findByRole('button', { name: 'Testar' })
    const avancada = screen.getByRole('button', { name: 'Configuração avançada' })
    const webhook = screen.getByRole('button', { name: 'Atualizar webhook' })

    expect(
      testar.compareDocumentPosition(avancada) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      avancada.compareDocumentPosition(webhook) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.queryByRole('tab', { name: 'Persona' })).not.toBeInTheDocument()

    fireEvent.click(avancada)

    expect(await screen.findByRole('heading', { name: 'Configuração avançada' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Persona' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mídia' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Filtros' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Jornada' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Base RAG' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ferramentas MCP' })).toBeInTheDocument()
    expect(screen.getByText('aba persona')).toBeVisible()

    fireEvent.click(screen.getByRole('tab', { name: 'Mídia' }))
    expect(await screen.findByText('aba midia')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByRole('tab', { name: 'Persona' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('conversas')).toBeInTheDocument()
  })
})
