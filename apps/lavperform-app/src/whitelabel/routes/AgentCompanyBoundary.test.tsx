import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentCompanyBoundary } from './AgentCompanyBoundary'

const auth = vi.hoisted(() => ({
  selectedCompany: { id: 'cabistani' } as { id: string } | null,
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => auth,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<p>lista de agentes</p>} path="/whitelabel/ai-agent" />
        <Route
          element={
            <AgentCompanyBoundary>
              <p>tela do agente</p>
            </AgentCompanyBoundary>
          }
          path="/whitelabel/ai-agent/:agentId/*"
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('AgentCompanyBoundary', () => {
  afterEach(() => {
    cleanup()
    auth.selectedCompany = { id: 'cabistani' }
  })

  it('mostra a tela do agente enquanto a empresa não muda', () => {
    renderAt('/whitelabel/ai-agent/agente-1/conversa')

    expect(screen.getByText('tela do agente')).toBeInTheDocument()
  })

  it('volta para a lista quando outra empresa é selecionada', async () => {
    const { rerender } = renderAt('/whitelabel/ai-agent/agente-1/conversa')
    expect(screen.getByText('tela do agente')).toBeInTheDocument()

    auth.selectedCompany = { id: 'borbulha' }
    rerender(
      <MemoryRouter initialEntries={['/whitelabel/ai-agent/agente-1/conversa']}>
        <Routes>
          <Route element={<p>lista de agentes</p>} path="/whitelabel/ai-agent" />
          <Route
            element={
              <AgentCompanyBoundary>
                <p>tela do agente</p>
              </AgentCompanyBoundary>
            }
            path="/whitelabel/ai-agent/:agentId/*"
          />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('lista de agentes')).toBeInTheDocument()
    expect(screen.queryByText('tela do agente')).not.toBeInTheDocument()
  })

  it('não troca de tela enquanto a empresa ainda está carregando', () => {
    auth.selectedCompany = null
    renderAt('/whitelabel/ai-agent/agente-1')

    expect(screen.getByText('tela do agente')).toBeInTheDocument()
  })
})
