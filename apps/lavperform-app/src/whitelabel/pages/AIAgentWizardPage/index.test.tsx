import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { Provider } from '@/components'

import { AIAgentWizardModal } from './index'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    selectedCompany: { id: 'company-1' },
    updateCompanyFlags: vi.fn(),
  }),
}))

vi.mock('@/whitelabel/services', () => ({
  aiAgentService: {
    getPromptSheet: vi.fn().mockResolvedValue({
      data: {
        serviceModel: 'CONVENTIONAL',
        snapshot: {
          name: 'Lavanderia Centro',
          phone: '11999999999',
          address: {
            street: 'Rua A',
            number: '10',
            complement: null,
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01000-000',
          },
          openingHours: [],
        },
        answers: {},
        updatedAt: null,
        agentName: null,
        agentObjective: null,
        pendingAgentId: null,
      },
    }),
  },
}))

describe('AIAgentWizardModal', () => {
  afterEach(() => {
    cleanup()
  })

  it('abre no modal perguntando o nome do agente', async () => {
    render(
      <Provider>
        <MemoryRouter>
          <AIAgentWizardModal open onClose={() => undefined} />
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText('Qual é o nome do agente?')).toBeInTheDocument()
    expect(screen.getByText('Novo agente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })
})
