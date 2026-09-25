import {
  Box,
  Button,
  HStack,
  Progress,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { AxiosError } from 'axios'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { aiAgentService } from '@/whitelabel/services'
import type {
  PromptDocument,
  PromptProposal,
  PromptSheetResponse,
  PromptStudioServiceModel,
} from '@/whitelabel/types'

import { answeredCount, nextQuestion, scriptFor } from './sheet-script'
import { progress } from './sheet-progress'
import { snapshotShownValue } from './snapshot-shown-value'

const NAO_TEM = 'Não tem'
const NAO_SE_APLICA = 'Não se aplica'
const STALE_MESSAGE = 'O texto mudou. Peça a alteração de novo.'

export type AdjustmentSeed = {
  question: string
  answer: string
  whatWasWrong: string
}

interface PromptSheetChatProps {
  companyId: string
  agentId?: string
  document?: PromptDocument | null
  personaUpdatedAt?: string | null
  draftChanged?: boolean
  onDocument: (document: PromptDocument) => void
  onSuggestedQuestions?: (questions: string[]) => void
  onAcceptProposal?: (proposal: PromptProposal) => Promise<void>
  adjustmentSeed?: AdjustmentSeed | null
  onAdjustmentSeedConsumed?: () => void
}

function PromptSheetChatBase({
  companyId,
  agentId,
  document = null,
  personaUpdatedAt = null,
  draftChanged = false,
  onDocument,
  onSuggestedQuestions,
  onAcceptProposal,
  adjustmentSeed = null,
  onAdjustmentSeedConsumed,
}: PromptSheetChatProps) {
  const [sheet, setSheet] = useState<PromptSheetResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const [adjustDraft, setAdjustDraft] = useState('')
  const [adjustmentMessages, setAdjustmentMessages] = useState<string[]>([])
  const [proposal, setProposal] = useState<PromptProposal | null>(null)
  const [isProposing, setIsProposing] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const seedHandledRef = useRef<string | null>(null)

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

  const runPropose = useCallback(
    async (payload: AdjustmentSeed, options?: { showInChat?: boolean }) => {
      if (!sheet || !model || !document) return

      const sheetUpdatedAt = sheet.updatedAt
      if (!sheetUpdatedAt) {
        setActionError('Ficha sem data de atualização. Recarregue e tente de novo.')
        return
      }

      const chatText =
        payload.answer.trim() ||
        payload.whatWasWrong.trim() ||
        ''
      if (options?.showInChat && chatText) {
        setAdjustmentMessages((prev) => [...prev, chatText])
      }

      setIsProposing(true)
      setActionError(null)
      try {
        const response = await aiAgentService.proposePromptStudio(
          companyId,
          {
            document,
            question: payload.question,
            answer: payload.answer,
            whatWasWrong: payload.whatWasWrong,
            baseUpdatedAt: personaUpdatedAt ?? undefined,
            currentUpdatedAt: personaUpdatedAt,
            draftChanged,
            sheetUpdatedAt,
          },
          agentId
        )
        setProposal(response.data)
      } catch (error) {
        const status =
          error instanceof AxiosError ? error.response?.status : undefined
        const message =
          error instanceof AxiosError
            ? (error.response?.data as { message?: string })?.message
            : undefined
        setActionError(
          status === 409 || message === STALE_MESSAGE
            ? STALE_MESSAGE
            : 'Não foi possível propor o ajuste. Tente de novo.'
        )
        setProposal(null)
      } finally {
        setIsProposing(false)
      }
    },
    [agentId, companyId, document, draftChanged, model, personaUpdatedAt, sheet]
  )

  useEffect(() => {
    if (!adjustmentSeed) {
      seedHandledRef.current = null
      return
    }
    if (!document || !sheet) return
    const key = `${adjustmentSeed.question}|${adjustmentSeed.whatWasWrong}|${adjustmentSeed.answer}`
    if (seedHandledRef.current === key) return
    seedHandledRef.current = key
    void runPropose(adjustmentSeed, { showInChat: true }).finally(() => {
      onAdjustmentSeedConsumed?.()
    })
  }, [adjustmentSeed, document, sheet, runPropose, onAdjustmentSeedConsumed])

  const submitAnswer = useCallback(
    async (value: string) => {
      if (!currentField) return
      const trimmed = value.trim()
      if (!trimmed) return

      setIsSaving(true)
      setActionError(null)
      setProposal(null)
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
    setProposal(null)
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

  const handleAdjustSend = useCallback(async () => {
    const content = adjustDraft.trim()
    if (!content) return
    setAdjustDraft('')
    setAdjustmentMessages((prev) => [...prev, content])
    await runPropose({
      question: '',
      answer: '',
      whatWasWrong: content,
    })
  }, [adjustDraft, runPropose])

  const handleAccept = useCallback(async () => {
    if (!proposal || !onAcceptProposal) return
    setIsAccepting(true)
    setActionError(null)
    try {
      // Server must refuse when the sheet changed, even without answerKey — before persona PATCH.
      if (proposal.sheetUpdatedAt) {
        await aiAgentService.assertPromptSheetFresh(
          companyId,
          proposal.sheetUpdatedAt,
          agentId
        )
      }

      // Persist persona first; then the sheet answer. Surface sheet errors (do not pretend success).
      await onAcceptProposal(proposal)

      if (proposal.answerKey && proposal.answerValue && proposal.sheetUpdatedAt) {
        const response = await aiAgentService.putPromptSheetAnswer(
          companyId,
          {
            key: proposal.answerKey,
            value: proposal.answerValue,
            sheetUpdatedAt: proposal.sheetUpdatedAt,
          },
          agentId
        )
        setSheet((prev) =>
          prev
            ? {
                ...prev,
                answers: response.data.answers,
                updatedAt: response.data.updatedAt,
              }
            : prev
        )
      }
      setProposal(null)
      setAdjustmentMessages([])
    } catch (error) {
      const status =
        error instanceof AxiosError ? error.response?.status : undefined
      const message =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string })?.message
          : undefined
      const errMessage = error instanceof Error ? error.message : undefined
      setActionError(
        status === 409 || message === STALE_MESSAGE || errMessage === STALE_MESSAGE
          ? STALE_MESSAGE
          : 'Não foi possível aceitar a proposta. Tente de novo.'
      )
    } finally {
      setIsAccepting(false)
    }
  }, [agentId, companyId, onAcceptProposal, proposal])

  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true)
    setActionError(null)
    try {
      if (agentId) {
        await aiAgentService.discardPromptStudioProposal(agentId)
      }
      setProposal(null)
      setAdjustmentMessages([])
    } catch {
      setActionError('Não foi possível descartar a proposta. Tente de novo.')
    } finally {
      setIsDiscarding(false)
    }
  }, [agentId])

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
          {document
            ? 'Ficha completa. Peça um ajuste ou gere o prompt de novo.'
            : 'Ficha completa. Gere o prompt quando quiser.'}
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
          {document ? 'Gerar de novo' : 'Gerar prompt'}
        </Button>

        {document ? (
          <Stack gap={3} align="stretch">
            <Text fontSize="sm" fontWeight="medium">
              Ajuste na mesma conversa
            </Text>
            <Textarea
              value={adjustDraft}
              onChange={(e) => setAdjustDraft(e.target.value)}
              placeholder="O que precisa mudar no prompt?"
              rows={3}
              disabled={isProposing || isAccepting}
            />
            <Button
              size="sm"
              alignSelf="flex-start"
              loading={isProposing}
              disabled={isProposing || !adjustDraft.trim()}
              onClick={() => void handleAdjustSend()}
            >
              Pedir ajuste
            </Button>

            {adjustmentMessages.length > 0 ? (
              <Stack gap={2} align="stretch">
                {adjustmentMessages.map((text, index) => (
                  <Box
                    key={`${index}-${text.slice(0, 24)}`}
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="bg.subtle"
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {text}
                    </Text>
                  </Box>
                ))}
              </Stack>
            ) : null}

            {proposal && onAcceptProposal ? (
              <Box borderWidth="1px" borderRadius="md" p={4}>
                <Stack gap={3}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Proposta de correção
                  </Text>
                  <Text fontSize="sm">{proposal.summary}</Text>
                  {Object.entries(proposal.changes).map(([key, value]) =>
                    value ? (
                      <Stack key={key} gap={1}>
                        <Text fontSize="xs" color="fg.muted" fontWeight="medium">
                          {key}
                        </Text>
                        <Text fontSize="sm" whiteSpace="pre-wrap">
                          {value}
                        </Text>
                      </Stack>
                    ) : null
                  )}
                  <HStack>
                    <Button
                      size="sm"
                      loading={isAccepting}
                      onClick={() => void handleAccept()}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isDiscarding}
                      onClick={() => void handleDiscard()}
                    >
                      Descartar
                    </Button>
                  </HStack>
                </Stack>
              </Box>
            ) : null}
          </Stack>
        ) : null}
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
