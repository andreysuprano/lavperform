import {
  Box,
  Button,
  HStack,
  Progress,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { aiAgentService } from '@/whitelabel/services'
import type {
  PromptDocument,
  PromptSheetResponse,
  PromptStudioServiceModel,
} from '@/whitelabel/types'

import { answeredCount, nextQuestion, scriptFor } from './sheet-script'
import { progress } from './sheet-progress'
import { snapshotShownValue } from './snapshot-shown-value'

const NAO_TEM = 'Não tem'
const NAO_SE_APLICA = 'Não se aplica'

interface PromptSheetChatProps {
  companyId: string
  agentId?: string
  onDocument: (document: PromptDocument) => void
  onSuggestedQuestions?: (questions: string[]) => void
}

function PromptSheetChatBase({
  companyId,
  agentId,
  onDocument,
  onSuggestedQuestions,
}: PromptSheetChatProps) {
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [draftValue, setDraftValue] = useState('')

  const loadSheet = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await aiAgentService.getPromptSheet(companyId, agentId)
      setSheet(response.data)
      setCorrecting(false)
      setDraftValue('')
    } catch {
      setLoadError('Não foi possível carregar a ficha. Tente de novo.')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, agentId])

  useEffect(() => {
    void loadSheet()
  }, [loadSheet])

  const model: PromptStudioServiceModel | null = sheet?.serviceModel ?? null

  const currentField = useMemo(() => {
    if (!sheet || !model) return null
    return nextQuestion(model, sheet.answers)
  }, [sheet, model])

  const total = model ? scriptFor(model).length : 0
  const answered = model && sheet ? answeredCount(model, sheet.answers) : 0
  const percent = progress(answered, total)

  const shownValue =
    currentField && sheet
      ? snapshotShownValue(currentField.key, sheet.snapshot)
      : null
  const isConfirmMode = Boolean(shownValue) && !correcting

  const submitAnswer = useCallback(
    async (value: string) => {
      if (!currentField) return
      const trimmed = value.trim()
      if (!trimmed) return

      setIsSaving(true)
      setActionError(null)
      try {
        const response = await aiAgentService.putPromptSheetAnswer(
          companyId,
          { key: currentField.key, value: trimmed },
          agentId
        )
        setSheet((prev) =>
          prev
            ? {
                ...prev,
                answers: response.data.answers,
                updatedAt: response.data.updatedAt,
                serviceModel:
                  (response.data.serviceModel as PromptStudioServiceModel) ??
                  prev.serviceModel,
              }
            : prev
        )
        setCorrecting(false)
        setDraftValue('')
      } catch {
        setActionError('Não foi possível gravar a resposta. Tente de novo.')
      } finally {
        setIsSaving(false)
      }
    },
    [agentId, companyId, currentField]
  )

  const handleGenerate = useCallback(async () => {
    if (!sheet || !model) return
    setIsGenerating(true)
    setActionError(null)
    try {
      const response = await aiAgentService.generatePromptStudio(
        { model, answers: sheet.answers },
        agentId
      )
      onDocument(response.data.document)
      onSuggestedQuestions?.(response.data.suggestedQuestions)
    } catch {
      setActionError('Não foi possível gerar o prompt. Tente de novo.')
    } finally {
      setIsGenerating(false)
    }
  }, [agentId, model, onDocument, onSuggestedQuestions, sheet])

  if (isLoading) {
    return (
      <Text fontSize="sm" color="fg.muted">
        Carregando ficha...
      </Text>
    )
  }

  if (loadError || !sheet || !model) {
    return (
      <Stack gap={3}>
        <Text fontSize="sm" color="fg.error">
          {loadError ?? 'Ficha indisponível.'}
        </Text>
        <Button size="sm" variant="outline" onClick={() => void loadSheet()}>
          Tentar de novo
        </Button>
      </Stack>
    )
  }

  if (!currentField) {
    return (
      <Stack gap={4} align="stretch">
        <Stack gap={1}>
          <HStack justify="space-between">
            <Text fontSize="xs" color="fg.muted">
              Progresso
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {percent}%
            </Text>
          </HStack>
          <Progress.Root value={percent} size="sm">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Stack>
        <Text fontSize="sm" color="fg.muted">
          Ficha completa. Gere o prompt quando quiser.
        </Text>
        {actionError ? (
          <Text fontSize="sm" color="fg.error">
            {actionError}
          </Text>
        ) : null}
        <Button
          onClick={() => void handleGenerate()}
          loading={isGenerating}
          disabled={isGenerating}
        >
          Gerar prompt
        </Button>
      </Stack>
    )
  }

  return (
    <Stack gap={4} align="stretch">
      <Stack gap={1}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="fg.muted">
            Progresso
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {answered}/{total} · {percent}%
          </Text>
        </HStack>
        <Progress.Root value={percent} size="sm">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Stack>

      <Box
        borderWidth="1px"
        borderRadius="md"
        p={4}
        bg="bg.subtle"
        textAlign="center"
      >
        <Text fontSize="xs" color="fg.muted" mb={2}>
          {currentField.label}
        </Text>
        <Text fontWeight="semibold" mb={3}>
          {currentField.question}
        </Text>

        {isConfirmMode ? (
          <Stack gap={3} align="stretch">
            <Text fontSize="sm">
              Valor no cadastro:{' '}
              <Text as="span" fontWeight="medium">
                {shownValue}
              </Text>
            </Text>
            <HStack justify="center" flexWrap="wrap">
              <Button
                size="sm"
                loading={isSaving}
                disabled={isSaving}
                onClick={() => void submitAnswer(shownValue!)}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setCorrecting(true)
                  setDraftValue(shownValue ?? '')
                }}
              >
                Corrigir
              </Button>
            </HStack>
          </Stack>
        ) : (
          <Stack gap={3} align="stretch">
            <Textarea
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder="Digite a resposta"
              rows={3}
              disabled={isSaving}
            />
            <HStack justify="center" flexWrap="wrap">
              <Button
                size="sm"
                loading={isSaving}
                disabled={isSaving || !draftValue.trim()}
                onClick={() => void submitAnswer(draftValue)}
              >
                Enviar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() => void submitAnswer(NAO_TEM)}
              >
                Não tem
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() => void submitAnswer(NAO_SE_APLICA)}
              >
                Não se aplica
              </Button>
              {correcting ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => {
                    setCorrecting(false)
                    setDraftValue('')
                  }}
                >
                  Voltar
                </Button>
              ) : null}
            </HStack>
          </Stack>
        )}
      </Box>

      {actionError ? (
        <Text fontSize="sm" color="fg.error">
          {actionError}
        </Text>
      ) : null}
    </Stack>
  )
}

const PromptSheetChat = memo(PromptSheetChatBase) as typeof PromptSheetChatBase

export { PromptSheetChat, type PromptSheetChatProps }
