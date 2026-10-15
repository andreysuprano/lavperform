import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '@/components'
import type { AIAgent } from '@/whitelabel/types'

import { PersonaTab } from './PersonaTab'

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ selectedCompany: { id: 'company-1' } }),
}))

vi.mock('@/whitelabel/hooks', () => ({
  useUpdateAIAgentPersona: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('../PromptStudio/PromptSheetChat', () => ({
  PromptSheetChat: () => <div>chat ficha</div>,
}))

vi.mock('../PromptStudio/PromptTestPanel', () => ({
  PromptTestPanel: () => <div>teste prompt</div>,
}))

vi.mock('./MarkdownField', () => ({
  MarkdownField: ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: string
    onChange: (value: string) => void
  }) => (
    <label>
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  ),
}))

const agent: AIAgent = {
  id: 'agent-1',
  name: 'Lia',
  active: true,
  companyId: 'company-1',
  persona: {
    personaName: 'Lia',
    contextPrompt: 'contexto salvo',
    systemPrompt: 'sistema salvo',
    behaviorGuidelines: 'regras salvas',
    guardrails: 'limites salvos',
    voiceTone: 'FORMAL',
    communicationStyle: 'BALANCED',
  },
}

describe('PersonaTab', () => {
  afterEach(() => {
    cleanup()
    mutateAsync.mockReset()
  })

  it('edita os quatro textos do prompt e salva', async () => {
    mutateAsync.mockResolvedValue(undefined)

    render(
      <Provider>
        <PersonaTab agent={agent} />
      </Provider>
    )

    const contexto = await screen.findByRole('textbox', {
      name: 'Contexto do negócio',
    })
    expect(contexto).toHaveValue('contexto salvo')
    expect(
      screen.getByRole('textbox', { name: 'Inteligência do agente (System Prompt)' })
    ).toHaveValue('sistema salvo')
    expect(
      screen.getByRole('textbox', { name: 'Regras de comportamento' })
    ).toHaveValue('regras salvas')
    expect(screen.getByRole('textbox', { name: 'Guardrails' })).toHaveValue(
      'limites salvos'
    )

    fireEvent.change(contexto, { target: { value: 'contexto editado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar persona' }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-1',
          data: expect.objectContaining({
            contextPrompt: 'contexto editado',
            systemPrompt: 'sistema salvo',
            behaviorGuidelines: 'regras salvas',
            guardrails: 'limites salvos',
          }),
        })
      )
    })
  })
})
