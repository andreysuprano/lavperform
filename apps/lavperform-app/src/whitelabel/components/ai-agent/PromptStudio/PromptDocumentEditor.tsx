import { Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { MarkdownField } from '../tabs/MarkdownField'

import type { PromptDocument } from './promptStudio.types'

interface PromptDocumentEditorProps {
  document: PromptDocument
  onChange: (document: PromptDocument) => void
}

function PromptDocumentEditorBase({
  document,
  onChange,
}: PromptDocumentEditorProps) {
  const updateField = (field: keyof PromptDocument, value: string) => {
    onChange({ ...document, [field]: value })
  }

  return (
    <Stack gap={5}>
      <MarkdownField
        label="Contexto do negócio"
        value={document.contextPrompt}
        onChange={(value) => updateField('contextPrompt', value)}
        placeholder="Informações da unidade injetadas no prompt..."
        height={200}
      />
      <MarkdownField
        label="Inteligência do agente (System Prompt)"
        value={document.systemPrompt}
        onChange={(value) => updateField('systemPrompt', value)}
        placeholder="Como o agente deve se comportar..."
        height={280}
      />
      <MarkdownField
        label="Regras de comportamento"
        value={document.behaviorGuidelines}
        onChange={(value) => updateField('behaviorGuidelines', value)}
        height={200}
      />
      <MarkdownField
        label="Guardrails"
        value={document.guardrails}
        onChange={(value) => updateField('guardrails', value)}
        height={200}
      />
    </Stack>
  )
}

const PromptDocumentEditor = memo(
  PromptDocumentEditorBase
) as typeof PromptDocumentEditorBase

export { PromptDocumentEditor, type PromptDocumentEditorProps }
