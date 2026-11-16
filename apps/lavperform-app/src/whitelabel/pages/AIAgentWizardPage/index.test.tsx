import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'
import { aiAgentService } from '@/whitelabel/services'
import type { PromptSheetResponse } from '@/whitelabel/types'

import { AIAgentWizardModal } from './index'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    selectedCompany: { id: 'company-1' },
    updateCompanyFlags: vi.fn(),
  }),
}))

vi.mock('@/whitelabel/services', () => ({
  aiAgentService: {
    getPromptSheet: vi.fn(),
    putPromptSheetIntro: vi.fn(),
    putPromptSheetAnswer: vi.fn(),
    finishWizard: vi.fn(),
  },
}))

function sheet(overrides: Partial<PromptSheetResponse> = {}) {
  return {
    data: {
      serviceModel: 'CONVENTIONAL' as const,
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
      ...overrides,
    },
  }
}

describe('AIAgentWizardModal', () => {
  beforeEach(() => {
    vi.mocked(aiAgentService.getPromptSheet).mockReset()
    vi.mocked(aiAgentService.putPromptSheetIntro).mockReset()
    vi.mocked(aiAgentService.putPromptSheetAnswer).mockReset()
    vi.mocked(aiAgentService.finishWizard).mockReset()
    vi.mocked(aiAgentService.getPromptSheet).mockResolvedValue(sheet())
    vi.mocked(aiAgentService.putPromptSheetIntro).mockResolvedValue({ data: sheet().data })
  })

  afterEach(() => {
    cleanup()
  })

  it('abre no modal perguntando o nome do agente', async () => {
    render(
      <Provider>
        <MemoryRouter>
          <AIAgentWizardModal onClose={() => undefined} open />
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText('Qual é o nome do agente?')).toBeInTheDocument()
    expect(screen.getByText('Novo agente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Alterar/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/auto serviço ou convencional/i)).not.toBeInTheDocument()
  })

  it('mostra a resposta anterior ao avançar e esconde o que ainda não foi respondido', async () => {
    vi.mocked(aiAgentService.getPromptSheet)
      .mockResolvedValueOnce(sheet())
      .mockResolvedValueOnce(sheet({ agentName: 'Lavanderia Centro' }))

    render(
      <Provider>
        <MemoryRouter>
          <AIAgentWizardModal onClose={() => undefined} open />
        </MemoryRouter>
      </Provider>
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Lavanderia Centro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText(/auto serviço ou convencional/i)).toBeInTheDocument()
    expect(screen.getByText('Qual é o nome do agente?')).toBeInTheDocument()
    expect(screen.getByText('Lavanderia Centro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar: Qual é o nome do agente?' })).toBeInTheDocument()
    expect(screen.queryByText(/ponto de referência/i)).not.toBeInTheDocument()
  })

  it('altera uma resposta anterior sem sair da etapa atual', async () => {
    vi.mocked(aiAgentService.getPromptSheet)
      .mockResolvedValueOnce(sheet({ agentName: 'Aria' }))
      .mockResolvedValueOnce(sheet({ agentName: 'Novo nome' }))

    render(
      <Provider>
        <MemoryRouter>
          <AIAgentWizardModal onClose={() => undefined} open />
        </MemoryRouter>
      </Provider>
    )

    expect(await screen.findByText(/auto serviço ou convencional/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alterar: Qual é o nome do agente?' }))
    const input = await screen.findByPlaceholderText('Escreva sua resposta')
    expect(input).toHaveValue('Aria')
    fireEvent.change(input, { target: { value: 'Novo nome' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(aiAgentService.putPromptSheetIntro).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({ agentName: 'Novo nome' })
      )
    })
    expect(await screen.findByText('Novo nome')).toBeInTheDocument()
    expect(screen.getByText(/auto serviço ou convencional/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/ponto de referência/i)).not.toBeInTheDocument()
  })
})
