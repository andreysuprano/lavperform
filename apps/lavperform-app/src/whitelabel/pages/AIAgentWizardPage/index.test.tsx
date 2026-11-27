import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'
import { CADASTRO_KEYS } from '@/whitelabel/components/ai-agent/PromptStudio/sheet-script'
import { wizardKeys } from '@/whitelabel/components/ai-agent/PromptStudio/wizard-steps'
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

function completeSheet() {
  const answers = Object.fromEntries(
    [...CADASTRO_KEYS, ...wizardKeys('CONVENTIONAL')].map((key) => [key, 'Não se aplica'])
  )
  return sheet({ agentName: 'Aria', agentObjective: 'Responder clientes.', answers })
}

function apiError(status: number, message: string) {
  return new AxiosError('falhou', 'ERR', undefined, undefined, {
    status,
    data: { statusCode: status, message },
  } as AxiosResponse)
}

async function clickCreate() {
  render(
    <Provider>
      <MemoryRouter>
        <AIAgentWizardModal onClose={() => undefined} open />
      </MemoryRouter>
    </Provider>
  )
  const button = await screen.findByRole('button', { name: 'Criar agente' })
  fireEvent.click(button)
  return button
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

  it('mostra o motivo, junto do botão, quando a API recusa a criação', async () => {
    const reason = 'Instância WhatsApp não encontrada para esta empresa. Conecte o WhatsApp antes de criar ou ativar o agente.'
    vi.mocked(aiAgentService.getPromptSheet).mockResolvedValue(completeSheet() as never)
    vi.mocked(aiAgentService.putPromptSheetAnswer).mockResolvedValue({ data: completeSheet().data } as never)
    vi.mocked(aiAgentService.finishWizard).mockRejectedValue(apiError(404, reason))

    await clickCreate()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(reason)
    expect(screen.getByTestId('wizard-footer')).toContainElement(alert)
  })

  it('avisa que a criação falhou sem expor o erro interno do servidor', async () => {
    vi.mocked(aiAgentService.getPromptSheet).mockResolvedValue(completeSheet() as never)
    vi.mocked(aiAgentService.putPromptSheetAnswer).mockResolvedValue({ data: completeSheet().data } as never)
    vi.mocked(aiAgentService.finishWizard).mockRejectedValue(apiError(502, 'Verifique o container'))

    await clickCreate()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível criar o agente. Tente de novo.')
  })

  it('mostra o botão carregando enquanto cria o agente', async () => {
    vi.mocked(aiAgentService.getPromptSheet).mockResolvedValue(completeSheet() as never)
    vi.mocked(aiAgentService.putPromptSheetAnswer).mockResolvedValue({ data: completeSheet().data } as never)
    vi.mocked(aiAgentService.finishWizard).mockReturnValue(new Promise(() => undefined) as never)

    const button = await clickCreate()

    await waitFor(() => expect(button).toHaveAttribute('data-loading'))
  })
})
