import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { Provider } from '@/components'

import { AIAgentConfiguratorPage } from './index'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
}))

vi.mock('@/whitelabel/services', () => ({
  aiAgentService: {
    listConfiguratorTurns: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

describe('AIAgentConfiguratorPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('mostra o título, as configurações e o campo de mensagem', async () => {
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
    expect(screen.getByRole('button', { name: 'Configurações' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument()
    expect(screen.getByText('Configurar agente')).toBeInTheDocument()
  })
})
