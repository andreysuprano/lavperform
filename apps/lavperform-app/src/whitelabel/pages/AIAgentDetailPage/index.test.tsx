import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
})
